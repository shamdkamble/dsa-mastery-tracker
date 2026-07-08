/**
 * Simple JSON file user store
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL ? "/tmp" : path.join(ROOT, "data");
const USERS_PATH = path.join(DATA_DIR, "users.json");
const SEED_PATH = path.join(ROOT, "data", "users.seed.json");

export const USER_STATUSES = ["pending", "approved", "rejected", "suspended"];
export const ACCESS_LEVELS = ["standard", "premium", "trial"];

function ensureStore() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!existsSync(USERS_PATH)) {
    const seed = existsSync(SEED_PATH)
      ? readFileSync(SEED_PATH, "utf8")
      : JSON.stringify({ users: [] }, null, 2);
    writeFileSync(USERS_PATH, seed, "utf8");
  }
}

function readStore() {
  ensureStore();
  const raw = readFileSync(USERS_PATH, "utf8");
  const data = JSON.parse(raw);
  return { users: Array.isArray(data.users) ? data.users : [] };
}

function writeStore(data) {
  ensureStore();
  writeFileSync(USERS_PATH, JSON.stringify(data, null, 2), "utf8");
}

function normalizeUser(user) {
  return {
    ...user,
    accessLevel: user.accessLevel || "standard",
    expiresAt: user.expiresAt ?? null,
  };
}

export function generateUserId() {
  return `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export function getAllUsers() {
  return readStore().users.map(normalizeUser);
}

export function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return getAllUsers().find((u) => u.email.toLowerCase() === normalized) || null;
}

export function findUserById(id) {
  return getAllUsers().find((u) => u.id === id) || null;
}

export function createUser({ id, name, email, passwordHash }) {
  const store = readStore();

  if (findUserByEmail(email)) {
    throw new Error("EMAIL_EXISTS");
  }

  const user = {
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: "user",
    status: "pending",
    accessLevel: "standard",
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(user);
  writeStore(store);
  return user;
}

export function updateUser(id, patch) {
  const store = readStore();
  const index = store.users.findIndex((u) => u.id === id);

  if (index === -1) {
    throw new Error("USER_NOT_FOUND");
  }

  const current = store.users[index];
  const next = { ...current, updatedAt: new Date().toISOString() };

  if (patch.status !== undefined) next.status = patch.status;
  if (patch.accessLevel !== undefined) next.accessLevel = patch.accessLevel;
  if (patch.expiresAt !== undefined) next.expiresAt = patch.expiresAt;
  if (patch.name !== undefined) next.name = patch.name.trim();

  store.users[index] = next;
  writeStore(store);
  return normalizeUser(next);
}

export function updateUserStatus(id, status) {
  return updateUser(id, { status });
}

export function deleteUser(id) {
  const store = readStore();
  const index = store.users.findIndex((u) => u.id === id);

  if (index === -1) {
    throw new Error("USER_NOT_FOUND");
  }

  const [removed] = store.users.splice(index, 1);
  writeStore(store);
  return removed;
}

export function getPendingUsers() {
  return getAllUsers().filter((u) => u.status === "pending");
}

export function toPublicUser(user) {
  const normalized = normalizeUser(user);
  return {
    id: normalized.id,
    name: normalized.name,
    email: normalized.email,
    role: normalized.role,
    status: normalized.status,
    accessLevel: normalized.accessLevel,
    expiresAt: normalized.expiresAt,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  };
}

export function isUserAccessValid(user) {
  const normalized = normalizeUser(user);
  if (normalized.status !== "approved") return false;
  if (!normalized.expiresAt) return true;
  return new Date(normalized.expiresAt).getTime() > Date.now();
}