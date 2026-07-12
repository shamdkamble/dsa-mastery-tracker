/**
 * Media upload API — Cloudflare R2
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";

export class MediaApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "MediaApiError";
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

  const missing = data?.error?.details?.missing;
  const hint = Array.isArray(missing) && missing.length
    ? ` Missing server env: ${missing.join(", ")}.`
    : "";

  return new MediaApiError(`${apiMessage}${hint}`, {
    status,
    code: data?.error?.code || "API_ERROR",
    details: data,
  });
}

async function uploadBinary(path, blob, mimeType, extraHeaders = {}) {
  const base = API_BASE_URL?.replace(/\/$/, "") ?? "";
  const headers = {
    "Content-Type": mimeType,
    Accept: "application/json",
    ...extraHeaders,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: blob,
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export function uploadProfilePhoto(blob, mimeType) {
  return uploadBinary("/api/media/profile-photo", blob, mimeType);
}

export function uploadChatImage(blob, mimeType, { threadId = "", studentId = "" } = {}) {
  const headers = {};
  if (threadId) headers["X-Thread-Id"] = threadId;
  if (studentId) headers["X-Student-Id"] = studentId;
  return uploadBinary("/api/media/chat-image", blob, mimeType, headers);
}

export async function removeProfilePhoto(currentUrl) {
  const base = API_BASE_URL?.replace(/\/$/, "") ?? "";
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}/api/media/profile-photo`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ currentUrl: currentUrl || "" }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}