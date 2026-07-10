/**
 * Web Push subscription API
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";
import { AuthApiError } from "../services/auth.js";

function resolveBaseUrl() {
  return API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function authHeaders() {
  const token = getToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
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

export async function fetchPushConfig() {
  const res = await fetch(`${resolveBaseUrl()}/api/push/config`, {
    headers: { Accept: "application/json" },
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function fetchPushStatus() {
  const token = getToken();
  if (!token) return { configured: false, subscribed: false };

  const res = await fetch(`${resolveBaseUrl()}/api/push/status`, {
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function savePushSubscription(subscription) {
  const res = await fetch(`${resolveBaseUrl()}/api/push/subscribe`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function removePushSubscription(endpoint) {
  const res = await fetch(`${resolveBaseUrl()}/api/push/unsubscribe`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify(endpoint ? { endpoint } : {}),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function sendTestPush() {
  const res = await fetch(`${resolveBaseUrl()}/api/push/test`, {
    method: "POST",
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}