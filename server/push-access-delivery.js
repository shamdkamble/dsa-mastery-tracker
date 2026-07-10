/**
 * Deliver system push for unread access notifications (incl. missed at approval time)
 */

import {
  listUndeliveredPushNotifications,
  markNotificationPushSent,
} from "./notifications-db.js";
import { hasPushSubscription } from "./push-subscriptions-db.js";
import { sendPushToUser } from "./push-service.js";

export function buildPushTag(eventTag, notificationId) {
  const base = String(eventTag || "access")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const id = String(notificationId || "").slice(-12);
  return id ? `${base}-${id}` : base || "dsamantra-access";
}

/**
 * @param {string} userId
 * @param {{ id: string, title: string, text: string, href?: string, pushTag?: string }} notification
 * @param {{ eventTag?: string }} options
 */
export async function deliverPushForNotification(userId, notification, { eventTag } = {}) {
  if (!notification?.id || !notification.title) {
    return { sent: 0, failed: 0, skipped: true, reason: "invalid_notification" };
  }

  const subscribed = await hasPushSubscription(userId);
  if (!subscribed) {
    return { sent: 0, failed: 0, skipped: true, reason: "no_subscriptions" };
  }

  const tag = buildPushTag(eventTag || notification.pushTag, notification.id);

  const result = await sendPushToUser(userId, {
    title: notification.title,
    body: notification.text,
    url: notification.href || "/#/dashboard",
    tag,
  });

  if (result.sent > 0) {
    await markNotificationPushSent(notification.id, userId);
  }

  return result;
}

/**
 * Send system push for access notifications that were never delivered.
 */
export async function deliverUndeliveredAccessPushes(userId) {
  const pending = await listUndeliveredPushNotifications(userId);
  if (!pending.length) {
    return { sent: 0, delivered: 0, pending: 0 };
  }

  let sent = 0;
  let delivered = 0;

  for (const notification of pending) {
    const result = await deliverPushForNotification(userId, notification, {
      eventTag: notification.pushTag,
    });
    if (result.sent > 0) {
      sent += result.sent;
      delivered += 1;
    }
  }

  return { sent, delivered, pending: pending.length };
}