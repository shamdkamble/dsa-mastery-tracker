/**
 * Authentication — admin hardcoded, users in JSON store
 */

import crypto from "crypto";
import { promisify } from "util";
import {
  createUser,
  findUserByEmail,
  findUserById,
  generateUserId,
  getPendingUsers,
  toPublicUser,
  updateUserStatus,
} from "./users-db.js";

const scrypt = promisify(crypto.scrypt);

export const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "Sdk@9370",
};

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getAuthSecret() {
  return process.env.AUTH_SECRET || "dsa-mastery-dev-secret-change-in-production";
}

export class AuthError extends Error {
  constructor(message, { status = 400, code = "AUTH_ERROR" } = {}) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored?.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const derived = await scrypt(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");
  if (derived.length !== hashBuffer.length) return false;
  return crypto.timingSafeEqual(derived, hashBuffer);
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  }));
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") {
    throw new AuthError("Missing authentication token.", { status: 401, code: "UNAUTHORIZED" });
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthError("Invalid authentication token.", { status: 401, code: "UNAUTHORIZED" });
  }

  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(`${header}.${body}`)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    throw new AuthError("Invalid authentication token.", { status: 401, code: "UNAUTHORIZED" });
  }

  const payload = JSON.parse(fromBase64url(body));

  if (!payload.exp || Date.now() > payload.exp) {
    throw new AuthError("Session expired. Please log in again.", { status: 401, code: "TOKEN_EXPIRED" });
  }

  return payload;
}

export function extractBearer(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

export function requireAuth(req, res, next) {
  try {
    const token = extractBearer(req);
    req.auth = verifyToken(token);
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: { message: err.message, code: err.code } });
      return;
    }
    res.status(401).json({ error: { message: "Unauthorized.", code: "UNAUTHORIZED" } });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "admin") {
      res.status(403).json({ error: { message: "Admin access required.", code: "FORBIDDEN" } });
      return;
    }
    next();
  });
}

function buildSession(user) {
  const token = signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });

  return { token, user: toPublicUser(user) };
}

function validateRegistration({ name, email, password }) {
  if (!name?.trim()) {
    throw new AuthError("Name is required.", { status: 400, code: "INVALID_INPUT" });
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("A valid email is required.", { status: 400, code: "INVALID_INPUT" });
  }
  if (!password || password.length < 6) {
    throw new AuthError("Password must be at least 6 characters.", { status: 400, code: "INVALID_INPUT" });
  }
}

export async function registerUser({ name, email, password }) {
  validateRegistration({ name, email, password });

  if (email.trim().toLowerCase() === "admin@dsa-mastery.local") {
    throw new AuthError("This email is reserved.", { status: 400, code: "INVALID_INPUT" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = createUser({
      id: generateUserId(),
      name,
      email,
      passwordHash,
    });
    return toPublicUser(user);
  } catch (err) {
    if (err.message === "EMAIL_EXISTS") {
      throw new AuthError("An account with this email already exists.", { status: 409, code: "EMAIL_EXISTS" });
    }
    throw err;
  }
}

export async function loginUser({ identifier, password }) {
  if (!identifier?.trim() || !password) {
    throw new AuthError("Email/username and password are required.", { status: 400, code: "INVALID_INPUT" });
  }

  const id = identifier.trim();

  if (id === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return buildSession({
      id: "admin",
      name: "Administrator",
      email: "admin@dsa-mastery.local",
      role: "admin",
      status: "approved",
      createdAt: new Date().toISOString(),
    });
  }

  if (!id.includes("@")) {
    throw new AuthError("Invalid email or password.", { status: 401, code: "INVALID_CREDENTIALS" });
  }

  const account = findUserByEmail(id);

  if (!account) {
    throw new AuthError("Invalid email or password.", { status: 401, code: "INVALID_CREDENTIALS" });
  }

  const valid = await verifyPassword(password, account.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password.", { status: 401, code: "INVALID_CREDENTIALS" });
  }

  if (account.status === "pending") {
    throw new AuthError("Your account is pending admin approval.", { status: 403, code: "PENDING_APPROVAL" });
  }

  if (account.status === "rejected") {
    throw new AuthError("Your registration was rejected. Contact the administrator.", { status: 403, code: "REJECTED" });
  }

  if (account.status !== "approved") {
    throw new AuthError("Your account is not approved.", { status: 403, code: "NOT_APPROVED" });
  }

  return buildSession(account);
}

export function getCurrentUser(token) {
  const payload = verifyToken(token);
  if (payload.sub === "admin") {
    return {
      id: "admin",
      name: payload.name || "Administrator",
      email: payload.email,
      role: "admin",
      status: "approved",
    };
  }

  const user = findUserById(payload.sub);
  if (!user) {
    throw new AuthError("User not found.", { status: 401, code: "UNAUTHORIZED" });
  }

  return toPublicUser(user);
}

export function listPendingUsers() {
  return getPendingUsers().map(toPublicUser);
}

export function approveUser(userId) {
  const user = updateUserStatus(userId, "approved");
  return toPublicUser(user);
}

export function rejectUser(userId) {
  const user = updateUserStatus(userId, "rejected");
  return toPublicUser(user);
}