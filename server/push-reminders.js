/**
 * Scheduled study push reminders (cron-driven, staggered local hours)
 */

import { connectDB } from "./db/mongodb.js";
import { User } from "./models/User.js";
import { PushReminderLog } from "./models/PushReminderLog.js";
import { getUserData } from "./user-data-store.js";
import { listNotificationPreferencesForUsers } from "./notification-preferences-db.js";
import { listDistinctUserIdsWithPushSubscriptions } from "./push-subscriptions-db.js";
import { sendPushToUser } from "./push-service.js";
import { computeStudySnapshot } from "./study-metrics.js";
import { getZonedParts, isDueInLocalHour } from "./cron-timezone.js";

/** User-local delivery hours — spread through the day to avoid notification spam. */
export const REMINDER_SCHEDULE = {
  "daily-mission": { hour: 9, label: "09:00" },
  "review-due": { hour: 14, label: "14:00" },
  "streak-risk": { hour: 20, label: "20:00" },
  "weekly-summary": { hour: 18, weekday: 0, label: "Sunday 18:00" },
};

const ALL_REMINDER_TYPES = Object.keys(REMINDER_SCHEDULE);

async function wasReminderSent(userId, reminderType, dateKey) {
  await connectDB();
  const existing = await PushReminderLog.findOne({ userId, reminderType, dateKey }).lean();
  return Boolean(existing);
}

async function markReminderSent(userId, reminderType, dateKey) {
  await connectDB();
  try {
    await PushReminderLog.create({ userId, reminderType, dateKey });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
}

async function sendReminderPush(userId, { title, body, url, tag, reminderType, dateKey }) {
  const result = await sendPushToUser(userId, { title, body, url, tag }, {
    source: "reminder",
    eventTag: reminderType || tag,
  });
  if (result.sent > 0) {
    await markReminderSent(userId, reminderType, dateKey);
  }
  return result;
}

function buildDailyMissionMessage(snapshot) {
  if (snapshot.missionPending > 0) {
    return {
      title: "Today's mission",
      body: `You have ${snapshot.missionPending} task${snapshot.missionPending === 1 ? "" : "s"} left on today's mission.`,
      url: "/#/mission",
      tag: "daily-mission",
    };
  }

  return {
    title: "Start today's mission",
    body: "Build your daily DSA habit — open Today's Mission and add problems to practice.",
    url: "/#/mission",
    tag: "daily-mission",
  };
}

function buildReviewDueMessage(snapshot) {
  return {
    title: "Reviews due",
    body: `You have ${snapshot.revisionsDue} spaced repetition review${snapshot.revisionsDue === 1 ? "" : "s"} waiting.`,
    url: "/#/mission",
    tag: "review-due",
  };
}

function buildStreakRiskMessage(snapshot) {
  return {
    title: "Streak at risk",
    body: `Your ${snapshot.streak}-day streak ends tonight — solve at least one problem to keep it going.`,
    url: "/#/dashboard",
    tag: "streak-risk",
  };
}

function buildWeeklySummaryMessage(snapshot) {
  return {
    title: "Weekly progress",
    body: `${snapshot.weeklySolved} problem${snapshot.weeklySolved === 1 ? "" : "s"} solved this week · ${snapshot.mastered} mastered overall.`,
    url: "/#/analytics",
    tag: "weekly-summary",
  };
}

function isTypeDue(type, zoned) {
  if (process.env.CRON_BATCH_MODE === "daily") {
    const schedule = REMINDER_SCHEDULE[type];
    if (!schedule) return false;
    if (schedule.weekday !== undefined && zoned.weekday !== schedule.weekday) return false;
    return true;
  }

  return isDueInLocalHour(REMINDER_SCHEDULE[type], zoned);
}

/**
 * Run due reminders. With hourly Vercel cron, only the matching local hour fires per type.
 * @param {{ allowedTypes?: string[] }} options
 */
export async function runScheduledPushReminders({ allowedTypes = null } = {}) {
  const typeFilter = Array.isArray(allowedTypes) && allowedTypes.length
    ? new Set(allowedTypes)
    : new Set(ALL_REMINDER_TYPES);

  const subscribedUserIds = await listDistinctUserIdsWithPushSubscriptions();
  if (!subscribedUserIds.length) {
    return { sent: 0, checked: 0, types: [] };
  }

  await connectDB();
  const approvedUsers = await User.find({
    id: { $in: subscribedUserIds },
    status: "approved",
    role: { $ne: "admin" },
  }).select({ id: 1 }).lean();

  const userIds = approvedUsers.map((u) => u.id);
  const prefsMap = await listNotificationPreferencesForUsers(userIds);

  let sent = 0;
  let checked = 0;
  const typesRun = new Set();

  for (const userId of userIds) {
    const prefs = prefsMap.get(userId) || {};
    const zoned = getZonedParts(new Date(), prefs.timezone || "Asia/Kolkata");

    const dueTypes = [];

    if (typeFilter.has("daily-mission") && prefs.dailyReminder && isTypeDue("daily-mission", zoned)) {
      dueTypes.push("daily-mission");
    }
    if (typeFilter.has("review-due") && prefs.reviewDue && isTypeDue("review-due", zoned)) {
      dueTypes.push("review-due");
    }
    if (typeFilter.has("streak-risk") && prefs.streakAlert && isTypeDue("streak-risk", zoned)) {
      dueTypes.push("streak-risk");
    }
    if (typeFilter.has("weekly-summary") && prefs.weeklySummary && isTypeDue("weekly-summary", zoned)) {
      dueTypes.push("weekly-summary");
    }

    if (!dueTypes.length) continue;

    checked += 1;

    let snapshot = null;
    const ensureSnapshot = async () => {
      if (!snapshot) {
        const data = await getUserData(userId);
        snapshot = computeStudySnapshot(data.problems, data.activities);
      }
      return snapshot;
    };

    for (const type of dueTypes) {
      typesRun.add(type);

      if (await wasReminderSent(userId, type, zoned.dateKey)) continue;

      const stats = await ensureSnapshot();
      let message = null;

      if (type === "daily-mission") {
        message = buildDailyMissionMessage(stats);
      } else if (type === "review-due") {
        if (stats.revisionsDue <= 0) continue;
        message = buildReviewDueMessage(stats);
      } else if (type === "streak-risk") {
        if (stats.streak <= 0 || stats.solvedToday) continue;
        message = buildStreakRiskMessage(stats);
      } else if (type === "weekly-summary") {
        message = buildWeeklySummaryMessage(stats);
      }

      if (!message) continue;

      const result = await sendReminderPush(userId, {
        ...message,
        reminderType: type,
        dateKey: zoned.dateKey,
      });

      sent += result.sent || 0;
    }
  }

  return {
    sent,
    checked,
    types: [...typesRun],
  };
}