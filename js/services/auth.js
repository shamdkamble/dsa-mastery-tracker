/**
 * Auth API client
 */

import { API_BASE_URL } from "../config.js";
import { getToken, setSession, clearSession } from "../auth/session.js";

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

export async function approveUser(userId) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/approve`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export async function rejectUser(userId) {
  const res = await fetch(`${resolveBaseUrl()}/api/auth/admin/reject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw errorFromResponse(res.status, data);
  return data;
}

export function logout() {
  clearSession();
}