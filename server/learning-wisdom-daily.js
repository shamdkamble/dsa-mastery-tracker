/**
 * Automated Daily Wisdom delivery (cron-driven, Phase 2)
 */

import { connectDB } from "./db/mongodb.js";
import { User } from "./models/User.js";
import { PushReminderLog } from "./models/PushReminderLog.js";
import { listNotificationPreferencesForUsers } from "./notification-preferences-db.js";
import { listDistinctUserIdsWithPushSubscriptions } from "./push-subscriptions-db.js";
import { deliverLearningFactToUser } from "./learning-fact-delivery.js";

const DAILY_WISDOM_HOUR = 9;
const DAILY_WISDOM_MINUTE = 0;

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    hour: Number.parseInt(map.hour, 10),
    minute: Number.parseInt(map.minute, 10),
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

function isDailyWisdomDue(zoned) {
  const isDailyBatch = process.env.VERCEL !== "1" || process.env.CRON_BATCH_MODE !== "hourly";
  if (isDailyBatch) return true;
  return zoned.hour === DAILY_WISDOM_HOUR && zoned.minute === DAILY_WISDOM_MINUTE;
}

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

/**
 * Deliver one personalized Daily Wisdom push per eligible user per day.
 */
export async function runDailyWisdomDelivery() {
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

  const userIds = approvedUsers.map((u) => u.id);
  const prefsMap = await listNotificationPreferencesForUsers(userIds);

  let sent = 0;
  let checked = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of userIds) {
    const prefs = prefsMap.get(userId) || {};
    if (prefs.dailyWisdom === false) continue;

    const zoned = getZonedParts(new Date(), prefs.timezone || "Asia/Kolkata");
    if (!isDailyWisdomDue(zoned)) continue;

    checked += 1;

    if (await wasDailyWisdomSent(userId, zoned.dateKey)) {
      skipped += 1;
      continue;
    }

    try {
      const result = await deliverLearningFactToUser(userId, { sendPush: true });

      if (!result.ok) {
        skipped += 1;
        continue;
      }

      if (result.push?.sent > 0) {
        await markDailyWisdomSent(userId, zoned.dateKey);
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { sent, checked, skipped, failed };
}