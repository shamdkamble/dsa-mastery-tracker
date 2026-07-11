/**
 * Testing panel API — QA issues
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";

export class TestIssuesApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "TestIssuesApiError";
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

  return new TestIssuesApiError(apiMessage, {
    status,
    code: data?.error?.code || "API_ERROR",
    details: data,
  });
}

async function request(path, options = {}) {
  const base = API_BASE_URL?.replace(/\/$/, "") ?? "";
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = await parseJsonSafe(res);

  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export function fetchTestIssues() {
  return request("/api/test-issues");
}

export function fetchTestIssueStats() {
  return request("/api/test-issues/stats");
}

export function apiCreateTestIssue(payload) {
  return request("/api/test-issues", { method: "POST", body: JSON.stringify(payload) });
}

export function apiUpdateTestIssue(id, payload) {
  return request(`/api/test-issues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiClearAllTestIssues() {
  return request("/api/auth/admin/test-issues/clear", {
    method: "POST",
    body: JSON.stringify({}),
  });
}