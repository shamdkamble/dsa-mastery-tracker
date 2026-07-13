/**
 * Automated Daily Wisdom delivery (cron-driven, Phase 2)
 */

import { connectDB } from "./db/mongodb.js";
import { User } from "./models/User.js";
import { PushReminderLog } from "./models/PushReminderLog.js";
import { listNotificationPreferencesForUsers } from "./notification-preferences-db.js";
import { listDistinctUserIdsWithPushSubscriptions } from "./push-subscriptions-db.js";
import { deliverLearningFactToUser } from "./learning-fact-delivery.js";
import { getZonedParts, isDueInLocalHour } from "./cron-timezone.js";

/** Morning insight — before mission reminder. */
export const DAILY_WISDOM_SCHEDULE = { hour: 7, label: "07:00" };

async function wasDailyWisdomSent(userId, dateKey) {
  await connectDB();
  const existing = await PushReminderLog.findOne({
    userId,
    reminderType: "daily-wisdom",
    dateKey,
  }).lean();
  return Boolean(existing);
}

async function markDailyWisdomSent(userId, dateKey) {
  await connectDB();
  try {
    await PushReminderLog.create({
      userId,
      reminderType: "daily-wisdom",
      dateKey,
    });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
}

function isDailyWisdomDue(zoned) {
  if (process.env.CRON_BATCH_MODE === "daily") return true;
  return isDueInLocalHour(DAILY_WISDOM_SCHEDULE, zoned);
}

/**
 * Deliver one personalized Daily Wisdom push per eligible user per day.
 * @param {{ force?: boolean, skipTimezone?: boolean, userId?: string }} options
 */
export async function runDailyWisdomDelivery({ force = false, skipTimezone = false, userId = null } = {}) {
  const subscribedUserIds = await listDistinctUserIdsWithPushSubscriptions();
  if (!subscribedUserIds.length) {
    return { sent: 0, checked: 0, skipped: 0, failed: 0 };
  }

  await connectDB();
  const approvedUsers = await User.find({
    id: { $in: subscribedUserIds },
    status: "approved",
    role: { $ne: "admin" },
  }).select({ id: 1 }).lean();

  let userIds = approvedUsers.map((u) => u.id);
  if (userId) {
    userIds = userIds.filter((id) => id === userId);
  }

  const prefsMap = await listNotificationPreferencesForUsers(userIds);

  let sent = 0;
  let checked = 0;
  let skipped = 0;
  let failed = 0;

  for (const uid of userIds) {
    const prefs = prefsMap.get(uid) || {};
    if (prefs.dailyWisdom === false && !force) continue;

    const zoned = getZonedParts(new Date(), prefs.timezone || "Asia/Kolkata");
    if (!skipTimezone && !isDailyWisdomDue(zoned)) continue;

    checked += 1;

    if (!force && await wasDailyWisdomSent(uid, zoned.dateKey)) {
      skipped += 1;
      continue;
    }

    try {
      const result = await deliverLearningFactToUser(uid, { sendPush: true });

      if (!result.ok) {
        skipped += 1;
        continue;
      }

      if (result.push?.sent > 0) {
        if (!force) {
          await markDailyWisdomSent(uid, zoned.dateKey);
        }
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { sent, checked, skipped, failed, forced: Boolean(force) };
}