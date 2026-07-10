/**
 * Notification preference persistence
 */

import { connectDB } from "./db/mongodb.js";
import { NotificationPreferences } from "./models/NotificationPreferences.js";

const DEFAULT_PREFS = {
  dailyReminder: true,
  streakAlert: true,
  reviewDue: true,
  weeklySummary: false,
  dailyWisdom: true,
  timezone: "Asia/Kolkata",
};

function normalize(doc) {
  if (!doc) return { ...DEFAULT_PREFS };
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    dailyReminder: d.dailyReminder ?? DEFAULT_PREFS.dailyReminder,
    streakAlert: d.streakAlert ?? DEFAULT_PREFS.streakAlert,
    reviewDue: d.reviewDue ?? DEFAULT_PREFS.reviewDue,
    weeklySummary: d.weeklySummary ?? DEFAULT_PREFS.weeklySummary,
    dailyWisdom: d.dailyWisdom ?? DEFAULT_PREFS.dailyWisdom,
    timezone: d.timezone || DEFAULT_PREFS.timezone,
  };
}

export async function getNotificationPreferences(userId) {
  if (!userId) return { ...DEFAULT_PREFS };

  await connectDB();
  const doc = await NotificationPreferences.findOne({ userId }).lean();
  return normalize(doc);
}

export async function upsertNotificationPreferences(userId, patch = {}) {
  if (!userId) return { ...DEFAULT_PREFS };

  await connectDB();

  const updates = {};
  if (patch.dailyReminder !== undefined) updates.dailyReminder = Boolean(patch.dailyReminder);
  if (patch.streakAlert !== undefined) updates.streakAlert = Boolean(patch.streakAlert);
  if (patch.reviewDue !== undefined) updates.reviewDue = Boolean(patch.reviewDue);
  if (patch.weeklySummary !== undefined) updates.weeklySummary = Boolean(patch.weeklySummary);
  if (patch.dailyWisdom !== undefined) updates.dailyWisdom = Boolean(patch.dailyWisdom);
  if (patch.timezone !== undefined) updates.timezone = String(patch.timezone || DEFAULT_PREFS.timezone).slice(0, 64);

  const doc = await NotificationPreferences.findOneAndUpdate(
    { userId },
    { $set: updates, $setOnInsert: { userId, ...DEFAULT_PREFS } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return normalize(doc);
}

export async function listNotificationPreferencesForUsers(userIds) {
  if (!userIds?.length) return new Map();

  await connectDB();
  const docs = await NotificationPreferences.find({ userId: { $in: userIds } }).lean();
  const map = new Map();

  userIds.forEach((id) => {
    map.set(id, { ...DEFAULT_PREFS });
  });

  docs.forEach((doc) => {
    map.set(doc.userId, normalize(doc));
  });

  return map;
}