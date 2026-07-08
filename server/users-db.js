/**
 * User database — MongoDB Atlas CRUD
 */

import crypto from "crypto";
import { connectDB } from "./db/mongodb.js";
import { User } from "./models/User.js";
import { ACCESS_LEVELS, USER_STATUSES } from "./user-constants.js";

export { ACCESS_LEVELS, USER_STATUSES };

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeUser(user) {
  if (!user) return null;
  const doc = user.toObject ? user.toObject() : user;
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role || "user",
    status: doc.status || "pending",
    accessLevel: doc.accessLevel || "standard",
    expiresAt: toIso(doc.expiresAt),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function generateUserId() {
  return `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export async function getAllUsers() {
  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return users.map(normalizeUser);
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  await connectDB();
  const user = await User.findOne({ email: normalized }).lean();
  return user ? normalizeUser(user) : null;
}

export async function findUserById(id) {
  await connectDB();
  const user = await User.findOne({ id }).lean();
  return user ? normalizeUser(user) : null;
}

export async function createUser({ id, name, email, passwordHash }) {
  await connectDB();

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const user = await User.create({
    id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "user",
    status: "pending",
    accessLevel: "standard",
    expiresAt: null,
  });

  return normalizeUser(user);
}

export async function updateUser(id, patch) {
  await connectDB();

  const updates = { updatedAt: new Date() };
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.accessLevel !== undefined) updates.accessLevel = patch.accessLevel;
  if (patch.expiresAt !== undefined) {
    updates.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
  }
  if (patch.name !== undefined) updates.name = patch.name.trim();

  const user = await User.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true },
  ).lean();

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return normalizeUser(user);
}

export async function updateUserStatus(id, status) {
  return updateUser(id, { status });
}

export async function deleteUser(id) {
  await connectDB();
  const removed = await User.findOneAndDelete({ id }).lean();

  if (!removed) {
    throw new Error("USER_NOT_FOUND");
  }

  return normalizeUser(removed);
}

export async function getPendingUsers() {
  await connectDB();
  const users = await User.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
  return users.map(normalizeUser);
}

export function toPublicUser(user) {
  const normalized = normalizeUser(user);
  if (!normalized) return null;
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
  if (!normalized) return false;
  if (normalized.status !== "approved") return false;
  if (!normalized.expiresAt) return true;
  return new Date(normalized.expiresAt).getTime() > Date.now();
}