/**
 * Auth API client
 */

import { API_BASE_URL } from "../config.js";
import { getToken, setSession, clearSession } from "../auth/session.js";
import { switchUserContext } from "../storage/db.js";
import { setState } from "../state.js";
import { dispatch } from "../utils.js";
import { resetAuthSyncState } from "../auth/guards.js";

export class AuthApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function resolveBaseUrl() {
  return API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function authHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

function errorFromResponse(status, data) {
  const message = data?.error?.message || data?.message || `Request failed (${status}).`;
  const code = data?.error?.code || "API_ERROR";
  return new AuthApiError(message, { status, code, details: data });
}

export async function register({ name, email, password }) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/register`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, email, password }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);

  if (data.token && data.user) {
    setSession({ token: data.token, user: data.user });
  }

  return data;
}

export async function login({ identifier, password }) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ identifier, password }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);

  setSession({ token: data.token, user: data.user });
  return data;
}

export async function fetchMe() {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/me`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);

  if (data.user && getToken()) {
    setSession({ token: getToken(), user: data.user });
  }

  return data.user;
}

export async function getPendingUsers() {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/pending`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data.users;
}

export async function getAllUsers() {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/users`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data.users;
}

export async function getLearningFactsPoolStats() {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/learning-facts/stats`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data.stats;
}

export async function getDailyWisdomDashboard() {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/learning-facts/dashboard`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data.dashboard;
}

export async function generateLearningFactsBatch({
  topicsPerCall = 18,
  replaceExisting = false,
  useGeminiFallback = false,
} = {}) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/learning-facts/generate-batch`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ topicsPerCall, replaceExisting, useGeminiFallback }),
  });

  const data = await parseJsonSafe(res);
  if (data?.needsGeminiFallback) return data;
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function seedLearningFacts() {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/learning-facts/seed`, {
    method: "POST",
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function deliverLearningFactToUser(userId, { sendPush = true } = {}) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/learning-facts/deliver`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId, sendPush }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function deliverLearningFactToMe({ sendPush = true } = {}) {
  const res = await fetch(`${resolveBaseUrl()}/api/learning-facts/deliver-next`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ sendPush }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function previewLearningFactAnchor() {
  const res = await fetch(`${resolveBaseUrl()}/api/learning-facts/anchor`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function runDailyWisdomCronNow({ force = true, skipTimezone = true, userId } = {}) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/cron/daily-wisdom`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ force, skipTimezone, userId }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function getPushDeliveryLogs({ limit = 100, status, source, userId, search } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  if (userId) params.set("userId", userId);
  if (search) params.set("search", search);

  const query = params.toString();
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/push-logs${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function adminUserAction(userId, action) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/action`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId, action }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function updateUserAdmin(userId, patch) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

/** @deprecated use adminUserAction(userId, "approve") */
export async function approveUser(userId) {
  return adminUserAction(userId, "approve");
}

/** @deprecated use adminUserAction(userId, "reject") */
export async function rejectUser(userId) {
  return adminUserAction(userId, "reject");
}

export function logout() {
  clearSession();
  resetAuthSyncState();
  import("../push-notifications.js").then(({ teardownPushOnLogout }) => {
    void teardownPushOnLogout();
  });
  import("./live-notifications.js").then(({ stopLiveNotificationPolling, resetLiveNotificationState }) => {
    stopLiveNotificationPolling();
    resetLiveNotificationState();
  });
  import("./notifications.js").then(({ setServerNotificationsCache }) => {
    setServerNotificationsCache([]);
  });
  void switchUserContext(null);
  setState({
    user: {
      name: "Guest",
      initials: "G",
      role: "DSA Learner",
    },
  });
  dispatch("auth:change", { user: null });
}