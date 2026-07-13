/**
 * Detect expired accounts and notify the user + administrators (deduped)
 */

import { connectDB } from "./db/mongodb.js";
import { User } from "./models/User.js";
import { normalizeUser } from "./users-db.js";
import { notifyAdminsAccountExpired } from "./admin-notifications.js";
import { notifyAccountExpired } from "./access-notifications.js";

function isExpired(user) {
  if (!user?.expiresAt) return false;
  return new Date(user.expiresAt).getTime() <= Date.now();
}

/**
 * Notify once when an approved user's access has expired.
 * @param {object} user - normalized user from users-db
 */
export async function maybeNotifyAccountExpired(user) {
  if (!user?.id) return { notified: false, reason: "invalid_user" };
  if (user.status !== "approved") return { notified: false, reason: "not_approved" };
  if (!isExpired(user)) return { notified: false, reason: "not_expired" };
  if (user.expiryNotifiedAt) return { notified: false, reason: "already_notified" };

  const marked = await User.findOneAndUpdate(
    { id: user.id, expiryNotifiedAt: null },
    { $set: { expiryNotifiedAt: new Date(), updatedAt: new Date() } },
    { new: true },
  ).lean();

  if (!marked) {
    return { notified: false, reason: "already_notified" };
  }

  const normalized = normalizeUser(marked);

  try {
    await Promise.all([
      notifyAccountExpired(normalized.id, normalized.expiresAt),
      notifyAdminsAccountExpired(normalized),
    ]);
  } catch (err) {
    await User.findOneAndUpdate(
      { id: user.id },
      { $set: { expiryNotifiedAt: null } },
    );
    throw err;
  }

  return { notified: true, userId: user.id };
}

/**
 * Scan for newly expired accounts (cron + admin notification poll).
 */
export async function runAccountExpiryChecks() {
  await connectDB();

  const now = new Date();
  const docs = await User.find({
    status: "approved",
    expiresAt: { $lte: now, $ne: null },
    expiryNotifiedAt: null,
  }).lean();

  const results = [];
  for (const doc of docs) {
    try {
      results.push(await maybeNotifyAccountExpired(normalizeUser(doc)));
    } catch (err) {
      console.warn("[account-expiry] notify failed", doc.id, err?.message);
      results.push({ notified: false, userId: doc.id, reason: "error" });
    }
  }

  const notified = results.filter((r) => r.notified);
  if (notified.length) {
    console.info("[account-expiry] notified", notified.map((r) => r.userId).join(", "));
  }

  return {
    scanned: docs.length,
    notified: notified.length,
    userIds: notified.map((r) => r.userId),
  };
}