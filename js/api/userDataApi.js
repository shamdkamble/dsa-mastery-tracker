/**
 * User data API — problems, activities, missions (MongoDB via server)
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";

export class UserDataApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "UserDataApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
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
  const apiMessage = typeof data?.error === "string"
    ? data.error
    : (data?.error?.message || data?.message || `Request failed (${status}).`);

  return new UserDataApiError(apiMessage, {
    status,
    code: data?.error?.code || "API_ERROR",
    details: data,
  });
}

function resolveBaseUrl() {
  return API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function authHeaders() {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${resolveBaseUrl()}${path}`, {
    method,
    headers: authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export function fetchUserData() {
  return request("/api/user-data");
}

export function migrateUserData(payload) {
  return request("/api/user-data/migrate", { method: "POST", body: payload });
}

export function apiCreateProblem(problem) {
  return request("/api/problems", { method: "POST", body: problem });
}

export function apiUpdateProblem(id, updates) {
  return request(`/api/problems/${encodeURIComponent(id)}`, { method: "PATCH", body: updates });
}

export function apiDeleteProblem(id) {
  return request(`/api/problems/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function apiCreateActivity(activity) {
  return request("/api/activities", { method: "POST", body: activity });
}

export function apiClearUserData(localSnapshot) {
  return request("/api/user-data/clear", { method: "POST", body: { localSnapshot } });
}

export function apiListUserDataArchives(userId) {
  return request(`/api/auth/admin/users/${encodeURIComponent(userId)}/data-archives`);
}

export function apiRestoreUserStudyData(userId, { archiveId } = {}) {
  return request(`/api/auth/admin/users/${encodeURIComponent(userId)}/restore-data`, {
    method: "POST",
    body: archiveId ? { archiveId } : {},
  });
}

export function apiAcknowledgeLocalRestore(archiveId) {
  return request("/api/user-data/ack-restore", {
    method: "POST",
    body: { archiveId },
  });
}