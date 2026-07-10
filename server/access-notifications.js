/**
 * Notification copy for admin access changes + Web Push delivery
 */

import { createUserNotification } from "./notifications-db.js";
import { deliverPushForNotification } from "./push-access-delivery.js";

function formatExpiryDate(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatExpiryDetail(expiresAt) {
  const formatted = formatExpiryDate(expiresAt);
  if (!formatted) return "No expiry date set.";

  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));

  if (days > 1) return `Access valid until ${formatted} (${days} days remaining).`;
  if (days === 1) return `Access valid until ${formatted} (1 day remaining).`;
  if (days === 0) return `Access expires today (${formatted}).`;
  return `Access expired on ${formatted}.`;
}

function levelLabel(level) {
  if (!level) return "Standard";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * @param {string} userId
 * @param {{ title: string, text: string, variant?: string, href?: string }} payload
 * @param {{ tag: string, sendPush?: boolean }} options
 * @returns {Promise<{ record: object|null, push: object|null }>}
 */
async function notifyUser(userId, payload, { tag, sendPush = true } = {}) {
  let record = null;

  try {
    record = await createUserNotification(userId, payload, { pushTag: tag });
  } catch (err) {
    console.error("[access-notifications] failed to create notification:", err?.message || err);
    return { record: null, push: null };
  }

  if (!sendPush || !record) {
    return { record, push: null };
  }

  let pushResult = await deliverPushForNotification(userId, {
    id: record.id,
    title: payload.title,
    text: payload.text,
    href: payload.href || "/#/dashboard",
    pushTag: tag,
  }, { eventTag: tag });

  if (pushResult.failed > 0 && pushResult.sent === 0 && !pushResult.skipped) {
    await new Promise((resolve) => { setTimeout(resolve, 400); });
    pushResult = await deliverPushForNotification(userId, {
      id: record.id,
      title: payload.title,
      text: payload.text,
      href: payload.href || "/#/dashboard",
      pushTag: tag,
    }, { eventTag: tag });
  }

  if (pushResult.skipped) {
    console.info("[access-notifications] web push skipped:", userId, tag, pushResult.reason);
  } else if (pushResult.failed > 0 && pushResult.sent === 0) {
    console.warn("[access-notifications] web push failed:", userId, tag, pushResult);
  } else {
    console.info("[access-notifications] web push sent:", userId, tag, pushResult);
  }

  return { record, push: pushResult };
}

export async function notifyAccountApproved(userId) {
  return notifyUser(userId, {
    title: "Account approved",
    text: "Your account has been approved. Welcome to DSAMantra — start your FAANG prep journey.",
    variant: "success",
    href: "#/dashboard",
  }, { tag: "account-approved" });
}

export async function notifyAccountRejected(userId) {
  return notifyUser(userId, {
    title: "Registration declined",
    text: "Your registration was not approved. Contact the administrator if you believe this is a mistake.",
    variant: "danger",
    href: "#/login",
  }, { tag: "account-rejected" });
}

export async function notifyAccountSuspended(userId) {
  return notifyUser(userId, {
    title: "Access suspended",
    text: "Your account access has been suspended. Contact the administrator to restore access.",
    variant: "danger",
    href: "#/login",
  }, { tag: "account-suspended" });
}

export async function notifyAccountActivated(userId) {
  return notifyUser(userId, {
    title: "Account reactivated",
    text: "Your account has been reactivated. Welcome back to DSAMantra.",
    variant: "success",
    href: "#/dashboard",
  }, { tag: "account-activated" });
}

/**
 * @param {object} before - user before patch
 * @param {object} after - user after patch
 * @param {{ accessLevel?: string, expiresAt?: string|null }} patch
 */
export async function notifyAccessPatch(before, after, patch) {
  const userId = after?.id;
  if (!userId) return { record: null, push: null };

  const prevLevel = before?.accessLevel || "standard";
  const nextLevel = after?.accessLevel || "standard";
  const prevExpiry = before?.expiresAt || null;
  const nextExpiry = after?.expiresAt || null;

  const levelChanged = patch.accessLevel !== undefined && prevLevel !== nextLevel;
  const expiryChanged = patch.expiresAt !== undefined && String(prevExpiry || "") !== String(nextExpiry || "");

  if (levelChanged && nextLevel === "trial") {
    return notifyUser(userId, {
      title: "Trial access granted",
      text: `You now have Trial access on DSAMantra. ${formatExpiryDetail(nextExpiry)}`,
      variant: "accent",
      href: "#/roadmap",
    }, { tag: "trial-granted" });
  }

  if (levelChanged && nextLevel === "premium") {
    return notifyUser(userId, {
      title: "Premium access granted",
      text: `Congratulations! You've been granted Premium access. ${formatExpiryDetail(nextExpiry)}`,
      variant: "success",
      href: "#/settings/subscription",
    }, { tag: "premium-granted" });
  }

  if (levelChanged && (prevLevel === "premium" || prevLevel === "trial") && nextLevel === "standard") {
    return notifyUser(userId, {
      title: "Premium access revoked",
      text: "Your Trial/Premium access has been changed to Standard. Some features may now be locked.",
      variant: "warning",
      href: "#/settings/subscription",
    }, { tag: "premium-revoked" });
  }

  if (levelChanged) {
    return notifyUser(userId, {
      title: "Access level updated",
      text: `Your access level is now ${levelLabel(nextLevel)}. ${formatExpiryDetail(nextExpiry)}`,
      variant: "info",
      href: "#/settings/subscription",
    }, { tag: "access-level-updated" });
  }

  if (expiryChanged) {
    if (!nextExpiry) {
      return notifyUser(userId, {
        title: "Access expiry cleared",
        text: `Your ${levelLabel(nextLevel)} access no longer has an expiry date.`,
        variant: "info",
        href: "#/settings/subscription",
      }, { tag: "access-expiry-cleared" });
    }

    return notifyUser(userId, {
      title: "Access expiry updated",
      text: `Your ${levelLabel(nextLevel)} access expiry has been updated. ${formatExpiryDetail(nextExpiry)}`,
      variant: "info",
      href: "#/settings/subscription",
    }, { tag: "access-expiry-updated" });
  }

  return { record: null, push: null };
}