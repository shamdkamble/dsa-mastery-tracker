/**
 * Web Push delivery via VAPID
 */

import webpush from "web-push";
import {
  deletePushSubscriptionByEndpoint,
  listPushSubscriptionsForUser,
  touchPushSubscription,
} from "./push-subscriptions-db.js";

let vapidReady = false;

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureVapid() {
  if (vapidReady) return true;
  if (!isPushConfigured()) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:push@dsamantra.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  vapidReady = true;
  return true;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 */
export async function sendPushToUser(userId, payload) {
  if (!ensureVapid()) {
    return { sent: 0, failed: 0, skipped: true, reason: "push_not_configured" };
  }

  const subscriptions = await listPushSubscriptionsForUser(userId);
  if (!subscriptions.length) {
    return { sent: 0, failed: 0, skipped: true, reason: "no_subscriptions" };
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/#/dashboard",
    tag: payload.tag || "dsamantra-notification",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, message);
      await touchPushSubscription(sub.endpoint);
      sent += 1;
    } catch (err) {
      failed += 1;
      const status = err?.statusCode || err?.status;
      if (status === 404 || status === 410) {
        await deletePushSubscriptionByEndpoint(sub.endpoint);
      }
      console.warn("[push-service] delivery failed:", status || err?.message || err);
    }
  }));

  return { sent, failed, skipped: false };
}