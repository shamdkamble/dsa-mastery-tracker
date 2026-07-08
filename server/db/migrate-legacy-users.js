/**
 * One-time import from legacy data/users.json when MongoDB is empty.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models/User.js";

const LEGACY_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
  "users.json",
);

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Import legacy JSON users if the Atlas collection has no documents yet.
 */
export async function migrateLegacyUsersIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return { migrated: 0, skipped: true };

  if (!existsSync(LEGACY_PATH)) {
    return { migrated: 0, skipped: true };
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(LEGACY_PATH, "utf8"));
  } catch {
    console.warn("[mongodb] Legacy users.json is invalid — skipping migration.");
    return { migrated: 0, skipped: true };
  }

  const legacyUsers = Array.isArray(parsed?.users) ? parsed.users : [];
  if (!legacyUsers.length) {
    return { migrated: 0, skipped: true };
  }

  const docs = legacyUsers.map((user) => ({
    id: user.id,
    name: user.name?.trim() || "User",
    email: user.email?.trim().toLowerCase(),
    passwordHash: user.passwordHash,
    role: user.role === "admin" ? "admin" : "user",
    status: user.status || "pending",
    accessLevel: user.accessLevel || "standard",
    expiresAt: toDate(user.expiresAt),
    createdAt: toDate(user.createdAt) || new Date(),
    updatedAt: toDate(user.updatedAt) || new Date(),
  })).filter((user) => user.id && user.email && user.passwordHash);

  if (!docs.length) {
    return { migrated: 0, skipped: true };
  }

  try {
    await User.insertMany(docs, { ordered: false });
    console.log(`[mongodb] Migrated ${docs.length} user(s) from legacy users.json`);
    return { migrated: docs.length, skipped: false };
  } catch (err) {
    if (err.code === 11000) {
      console.warn("[mongodb] Some legacy users already exist — partial migration skipped.");
      return { migrated: 0, skipped: true };
    }
    throw err;
  }
}