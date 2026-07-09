/**
 * Server-pushed user notifications API
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";
import { AuthApiError } from "./auth.js";

function resolveBaseUrl() {
  return API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function authHeaders() {
  const token = getToken();
  const headers = { Accept: "application/json" };
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

export async function fetchServerNotifications() {
  const token = getToken();
  if (!token) return [];

  const res = await fetch(`${resolveBaseUrl()}/api/notifications`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data?.notifications || [];
}

export async function markServerNotificationRead(notificationId) {
  const res = await fetch(
    `${resolveBaseUrl()}/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "POST", headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data?.notification;
}

export async function markAllServerNotificationsRead() {
  const res = await fetch(`${resolveBaseUrl()}/api/notifications/read-all`, {
    method: "POST",
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}