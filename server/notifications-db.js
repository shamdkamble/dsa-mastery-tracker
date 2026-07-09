/**
 * User notification persistence
 */

import crypto from "crypto";
import { connectDB } from "./db/mongodb.js";
import { UserNotification } from "./models/UserNotification.js";

function generateNotificationId() {
  return `notif_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function normalize(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d.id,
    userId: d.userId,
    title: d.title,
    text: d.text,
    variant: d.variant || "info",
    href: d.href || "#/settings",
    read: Boolean(d.read),
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * @param {string} userId
 * @param {{ title: string, text: string, variant?: string, href?: string }} payload
 */
export async function createUserNotification(userId, payload) {
  if (!userId || !payload?.title || !payload?.text) return null;

  await connectDB();

  const doc = await UserNotification.create({
    id: generateNotificationId(),
    userId,
    title: payload.title,
    text: payload.text,
    variant: payload.variant || "info",
    href: payload.href || "#/settings",
    read: false,
  });

  return normalize(doc);
}

export async function listUserNotifications(userId, { limit = 40 } = {}) {
  await connectDB();
  const docs = await UserNotification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map(normalize);
}

export async function markUserNotificationRead(userId, notificationId) {
  await connectDB();
  const doc = await UserNotification.findOneAndUpdate(
    { id: notificationId, userId },
    { $set: { read: true } },
    { new: true },
  ).lean();
  return doc ? normalize(doc) : null;
}

export async function markAllUserNotificationsRead(userId) {
  await connectDB();
  await UserNotification.updateMany({ userId, read: false }, { $set: { read: true } });
  return { ok: true };
}