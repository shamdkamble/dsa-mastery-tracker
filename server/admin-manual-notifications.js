/**
 * Admin manual notifications — in-app + optional Web Push to one or many users
 */

import { getAllUsers } from "./users-db.js";
import { createUserNotification } from "./notifications-db.js";
import { deliverPushForNotification } from "./push-access-delivery.js";

function buildTag() {
  return `admin-manual-${Date.now()}`;
}

async function resolveTargetUserIds(userIds) {
  const all = await getAllUsers();
  const candidates = all.filter((u) => u.role !== "admin");

  if (!Array.isArray(userIds) || !userIds.length) {
    return { userIds: [], users: [] };
  }

  if (userIds.includes("all")) {
    return { userIds: candidates.map((u) => u.id), users: candidates };
  }

  const idSet = new Set(userIds);
  const users = candidates.filter((u) => idSet.has(u.id));
  return { userIds: users.map((u) => u.id), users };
}

/**
 * @param {string[]} userIds — user ids or ["all"]
 * @param {{ title: string, text: string, variant?: string, href?: string, sendPush?: boolean }} payload
 */
export async function sendAdminManualNotifications(userIds, {
  title,
  text,
  variant = "info",
  href = "#/dashboard",
  sendPush = true,
} = {}) {
  const trimmedTitle = String(title || "").trim();
  const trimmedText = String(text || "").trim();

  if (!trimmedTitle || !trimmedText) {
    return { ok: false, code: "INVALID_INPUT", message: "Title and message are required." };
  }

  const { userIds: targetIds, users } = await resolveTargetUserIds(userIds);

  if (!targetIds.length) {
    return { ok: false, code: "NO_RECIPIENTS", message: "Select at least one user." };
  }

  const tag = buildTag();
  const results = [];

  for (const user of users) {
    let record = null;
    let push = null;

    try {
      record = await createUserNotification(user.id, {
        title: trimmedTitle,
        text: trimmedText,
        variant,
        href,
      }, { pushTag: tag });
    } catch (err) {
      results.push({
        userId: user.id,
        userName: user.name,
        ok: false,
        error: err?.message || "Failed to create notification",
      });
      continue;
    }

    if (sendPush && record) {
      push = await deliverPushForNotification(user.id, {
        id: record.id,
        title: trimmedTitle,
        text: trimmedText,
        href,
        pushTag: tag,
      }, { eventTag: "admin-manual", source: "manual" });
    }

    results.push({
      userId: user.id,
      userName: user.name,
      ok: true,
      notification: record,
      pushDelivery: push,
    });
  }

  const sent = results.filter((r) => r.ok).length;
  const pushSent = results.filter((r) => r.pushDelivery?.sent > 0).length;

  return {
    ok: true,
    total: targetIds.length,
    sent,
    pushSent,
    results,
  };
}