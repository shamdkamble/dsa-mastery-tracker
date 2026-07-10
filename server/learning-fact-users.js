/**
 * Resolve display names for learning fact personalization
 */

import { findUserById } from "./users-db.js";

export async function resolveUserFirstName(userId) {
  if (!userId) return "there";
  if (userId === "admin") return "Admin";

  const user = await findUserById(userId);
  if (!user?.name) return "there";

  return String(user.name).trim().split(/\s+/)[0] || "there";
}

export async function resolveUserDisplayName(userId) {
  if (!userId) return "Learner";
  if (userId === "admin") return "Administrator";

  const user = await findUserById(userId);
  return user?.name || "Learner";
}