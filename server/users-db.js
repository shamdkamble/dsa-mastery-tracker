/**
 * User database — CRUD over persistent JSON store
 */

import crypto from "crypto";
import { readUsersStore, writeUsersStore } from "./user-store.js";

export const USER_STATUSES = ["pending", "approved", "rejected", "suspended"];
export const ACCESS_LEVELS = ["standard", "premium", "trial"];

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

export async function getAllUsers() {
  const store = await readUsersStore();
  return store.users.map(normalizeUser);
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const users = await getAllUsers();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function findUserById(id) {
  const users = await getAllUsers();
  return users.find((u) => u.id === id) || null;
}

export async function createUser({ id, name, email, passwordHash }) {
  const store = await readUsersStore();

  const normalizedEmail = email.trim().toLowerCase();
  if (store.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error("EMAIL_EXISTS");
  }

  const user = {
    id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "user",
    status: "pending",
    accessLevel: "standard",
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(user);
  await writeUsersStore(store);
  return user;
}

export async function updateUser(id, patch) {
  const store = await readUsersStore();
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
  await writeUsersStore(store);
  return normalizeUser(next);
}

export async function updateUserStatus(id, status) {
  return updateUser(id, { status });
}

export async function deleteUser(id) {
  const store = await readUsersStore();
  const index = store.users.findIndex((u) => u.id === id);

  if (index === -1) {
    throw new Error("USER_NOT_FOUND");
  }

  const [removed] = store.users.splice(index, 1);
  await writeUsersStore(store);
  return removed;
}

export async function getPendingUsers() {
  const users = await getAllUsers();
  return users.filter((u) => u.status === "pending");
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