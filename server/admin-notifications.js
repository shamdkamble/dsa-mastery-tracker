/**
 * In-app + Web Push alerts for administrators
 */

import { createUserNotification } from "./notifications-db.js";
import { deliverPushForNotification } from "./push-access-delivery.js";
import { User } from "./models/User.js";

const ADMIN_INBOX_USER_ID = "admin";

async function notifyAdminUser(userId, payload, { pushTag, source = "admin-alert" }) {
  let record = null;
  try {
    record = await createUserNotification(userId, payload, { pushTag });
  } catch (err) {
    console.warn("[admin-notifications] notify failed", userId, err?.message);
    return null;
  }
  if (!record) return null;

  try {
    const pushResult = await deliverPushForNotification(userId, {
      id: record.id,
      title: payload.title,
      text: payload.text,
      href: payload.href || "#/admin",
      pushTag,
    }, { eventTag: pushTag, source });

    if (pushResult.failed > 0 && pushResult.sent === 0 && !pushResult.skipped) {
      await new Promise((resolve) => { setTimeout(resolve, 400); });
      await deliverPushForNotification(userId, {
        id: record.id,
        title: payload.title,
        text: payload.text,
        href: payload.href || "#/admin",
        pushTag,
      }, { eventTag: pushTag, source });
    }
  } catch (err) {
    console.warn("[admin-notifications] push failed", userId, err?.message);
  }

  return record;
}

/**
 * @param {{ title: string, text: string, variant?: string, href?: string }} payload
 * @param {{ pushTag: string, source?: string }} options
 */
export async function notifyAdmins(payload, { pushTag, source = "admin-alert" } = {}) {
  if (!pushTag) return;

  const ids = new Set([ADMIN_INBOX_USER_ID]);
  try {
    const admins = await User.find({ role: "admin" }).select("id").lean();
    admins.forEach((a) => ids.add(a.id));
  } catch {
    /* ignore */
  }

  await Promise.all([...ids].map((userId) =>
    notifyAdminUser(userId, payload, { pushTag: `${pushTag}-${userId}`, source }),
  ));
}

export async function notifyAdminsRegistrationPending(user) {
  const name = user?.name || "Someone";
  const email = user?.email || "";
  await notifyAdmins({
    title: "New registration pending",
    text: `${name} (${email}) requested account access. Review in Admin Panel.`,
    variant: "accent",
    href: "#/admin",
  }, { pushTag: `registration-pending-${user.id}`, source: "registration" });
}

function formatExpiryDate(expiresAt) {
  if (!expiresAt) return "unknown date";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "unknown date";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function notifyAdminsAccountExpired(user) {
  const name = user?.name || "User";
  const email = user?.email || "";
  await notifyAdmins({
    title: "Account expired",
    text: `${name} (${email}) access expired on ${formatExpiryDate(user.expiresAt)}.`,
    variant: "warning",
    href: "#/admin",
  }, { pushTag: `account-expired-admin-${user.id}`, source: "account-expiry" });
}