/**
 * Notification copy for admin access changes
 */

import { createUserNotification } from "./notifications-db.js";

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

async function push(userId, payload) {
  try {
    await createUserNotification(userId, payload);
  } catch (err) {
    console.error("[access-notifications] failed to create notification:", err?.message || err);
  }
}

export async function notifyAccountApproved(userId) {
  await push(userId, {
    title: "Account approved",
    text: "Your account has been approved. Welcome to DSAMantra — start your FAANG prep journey.",
    variant: "success",
    href: "#/dashboard",
  });
}

export async function notifyAccountRejected(userId) {
  await push(userId, {
    title: "Registration declined",
    text: "Your registration was not approved. Contact the administrator if you believe this is a mistake.",
    variant: "danger",
    href: "#/login",
  });
}

export async function notifyAccountSuspended(userId) {
  await push(userId, {
    title: "Access suspended",
    text: "Your account access has been suspended. Contact the administrator to restore access.",
    variant: "danger",
    href: "#/login",
  });
}

export async function notifyAccountActivated(userId) {
  await push(userId, {
    title: "Account reactivated",
    text: "Your account has been reactivated. Welcome back to DSAMantra.",
    variant: "success",
    href: "#/dashboard",
  });
}

/**
 * @param {object} before - user before patch
 * @param {object} after - user after patch
 * @param {{ accessLevel?: string, expiresAt?: string|null }} patch
 */
export async function notifyAccessPatch(before, after, patch) {
  const userId = after?.id;
  if (!userId) return;

  const prevLevel = before?.accessLevel || "standard";
  const nextLevel = after?.accessLevel || "standard";
  const prevExpiry = before?.expiresAt || null;
  const nextExpiry = after?.expiresAt || null;

  const levelChanged = patch.accessLevel !== undefined && prevLevel !== nextLevel;
  const expiryChanged = patch.expiresAt !== undefined && prevExpiry !== nextExpiry;

  if (levelChanged && nextLevel === "trial") {
    await push(userId, {
      title: "Trial access granted",
      text: `You now have Trial access on DSAMantra. ${formatExpiryDetail(nextExpiry)}`,
      variant: "accent",
      href: "#/roadmap",
    });
    return;
  }

  if (levelChanged && nextLevel === "premium") {
    await push(userId, {
      title: "Premium access granted",
      text: `Congratulations! You've been granted Premium access. ${formatExpiryDetail(nextExpiry)}`,
      variant: "success",
      href: "#/settings",
    });
    return;
  }

  if (levelChanged && (prevLevel === "premium" || prevLevel === "trial") && nextLevel === "standard") {
    await push(userId, {
      title: "Premium access revoked",
      text: "Your Trial/Premium access has been changed to Standard. Some features may now be locked.",
      variant: "warning",
      href: "#/settings",
    });
    return;
  }

  if (levelChanged) {
    await push(userId, {
      title: "Access level updated",
      text: `Your access level is now ${levelLabel(nextLevel)}. ${formatExpiryDetail(nextExpiry)}`,
      variant: "info",
      href: "#/settings",
    });
    return;
  }

  if (expiryChanged) {
    if (!nextExpiry) {
      await push(userId, {
        title: "Access expiry cleared",
        text: `Your ${levelLabel(nextLevel)} access no longer has an expiry date.`,
        variant: "info",
        href: "#/settings",
      });
      return;
    }

    await push(userId, {
      title: "Access expiry updated",
      text: `Your ${levelLabel(nextLevel)} access expiry has been updated. ${formatExpiryDetail(nextExpiry)}`,
      variant: "info",
      href: "#/settings",
    });
  }
}