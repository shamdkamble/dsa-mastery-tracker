/**
 * Web Push delivery via VAPID
 */

import webpush from "web-push";
import {
  deletePushSubscriptionByEndpoint,
  listPushSubscriptionsForUser,
  touchPushSubscription,
} from "./push-subscriptions-db.js";
import { createPushDeliveryLog } from "./push-delivery-log-db.js";

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

function baseLogFields(userId, payload, meta = {}) {
  return {
    userId,
    source: meta.source || "access",
    eventTag: meta.eventTag || "",
    notificationId: meta.notificationId || null,
    title: payload.title,
    body: payload.body || "",
    pushTag: payload.tag || "",
    userName: meta.userName,
    userEmail: meta.userEmail,
  };
}

async function logSkipped(userId, payload, meta, reason) {
  try {
    await createPushDeliveryLog({
      ...baseLogFields(userId, payload, meta),
      status: "skipped",
      reason,
      devicesTotal: 0,
      devicesSent: 0,
      devicesFailed: 0,
    });
  } catch (err) {
    console.warn("[push-service] failed to write skipped log:", err?.message || err);
  }
}

/**
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 * @param {{ source?: string, eventTag?: string, notificationId?: string, userName?: string, userEmail?: string }} meta
 */
export async function sendPushToUser(userId, payload, meta = {}) {
  if (!ensureVapid()) {
    await logSkipped(userId, payload, meta, "push_not_configured");
    return { sent: 0, failed: 0, skipped: true, reason: "push_not_configured" };
  }

  const subscriptions = await listPushSubscriptionsForUser(userId);
  if (!subscriptions.length) {
    await logSkipped(userId, payload, meta, "no_subscriptions");
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
  const total = subscriptions.length;

  await Promise.all(subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, message, {
        TTL: 60 * 60 * 24,
        urgency: "high",
      });
      await touchPushSubscription(sub.endpoint);
      sent += 1;

      try {
        await createPushDeliveryLog({
          ...baseLogFields(userId, payload, meta),
          status: "sent",
          endpoint: sub.endpoint,
          userAgent: sub.userAgent,
          devicesTotal: total,
          devicesSent: 1,
          devicesFailed: 0,
        });
      } catch (logErr) {
        console.warn("[push-service] failed to write sent log:", logErr?.message || logErr);
      }
    } catch (err) {
      failed += 1;
      const status = err?.statusCode || err?.status;
      const errorMessage = err?.body || err?.message || String(err);

      if (status === 404 || status === 410) {
        await deletePushSubscriptionByEndpoint(sub.endpoint);
      }

      console.warn("[push-service] delivery failed:", status || err?.message || err);

      try {
        await createPushDeliveryLog({
          ...baseLogFields(userId, payload, meta),
          status: "failed",
          reason: status === 410 ? "subscription_expired" : status === 404 ? "subscription_not_found" : "delivery_error",
          errorCode: status || null,
          errorMessage: String(errorMessage).slice(0, 500),
          endpoint: sub.endpoint,
          userAgent: sub.userAgent,
          devicesTotal: total,
          devicesSent: 0,
          devicesFailed: 1,
        });
      } catch (logErr) {
        console.warn("[push-service] failed to write failure log:", logErr?.message || logErr);
      }
    }
  }));

  return { sent, failed, skipped: false };
}

/**
 * Send a test push to the current user's subscriptions.
 */
export async function sendTestPushToUser(userId) {
  return sendPushToUser(userId, {
    title: "DSAMantra",
    body: "Push notifications are working on this device.",
    url: "/#/dashboard",
    tag: "push-test",
  }, {
    source: "test",
    eventTag: "push-test",
  });
}