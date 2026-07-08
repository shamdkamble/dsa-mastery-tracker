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

export function generateUserId() {
  return `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export function getAllUsers() {
  return readStore().users;
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(user);
  writeStore(store);
  return user;
}

export function updateUserStatus(id, status) {
  const store = readStore();
  const index = store.users.findIndex((u) => u.id === id);

  if (index === -1) {
    throw new Error("USER_NOT_FOUND");
  }

  store.users[index] = {
    ...store.users[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
  return store.users[index];
}

export function getPendingUsers() {
  return getAllUsers().filter((u) => u.status === "pending");
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}