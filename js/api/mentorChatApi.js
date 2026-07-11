/**
 * Mentor Desk API
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";

export class MentorChatApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "MentorChatApiError";
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

  return new MentorChatApiError(apiMessage, {
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

export function fetchStudentThread() {
  return request("/api/mentor-chat/thread");
}

export function sendStudentChatMessage(body) {
  return request("/api/mentor-chat/messages", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function fetchAdminInbox() {
  return request("/api/auth/admin/mentor-chat/threads");
}

export function fetchAdminThread(threadId) {
  return request(`/api/auth/admin/mentor-chat/threads/${encodeURIComponent(threadId)}`);
}

export function fetchAdminStudentThread(studentId) {
  return request(`/api/auth/admin/mentor-chat/students/${encodeURIComponent(studentId)}`);
}

export function sendAdminChatMessage(threadId, body) {
  return request(`/api/auth/admin/mentor-chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function sendAdminChatMessageToStudent(studentId, body) {
  return request(`/api/auth/admin/mentor-chat/students/${encodeURIComponent(studentId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}