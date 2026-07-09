/**
 * Teach / lesson API — cached lessons & roadmap progress
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";
import { TeachApiError } from "./geminiApi.js";

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

  return new TeachApiError(apiMessage, {
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

async function request(path, { method = "GET", body, signal, timeoutMs = 120_000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${resolveBaseUrl()}${path}`, {
      method,
      headers: authHeaders(),
      body: body != null ? JSON.stringify(body) : undefined,
      signal: signal ?? controller.signal,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) throw errorFromResponse(res.status, data);
    return data;
  } catch (err) {
    if (err instanceof TeachApiError) throw err;
    if (err?.name === "AbortError") {
      throw new TeachApiError("Request timed out.", { code: "TIMEOUT" });
    }
    if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
      throw new TeachApiError("Cannot reach the API. Run npm start.", { code: "NETWORK_ERROR" });
    }
    throw new TeachApiError(err?.message || "Unexpected error.", { code: "UNKNOWN", details: err });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string} topicId
 */
export function fetchCachedLesson(topicId) {
  return request(`/api/teach/lesson/${encodeURIComponent(topicId)}`);
}

/**
 * @param {Object} topic
 * @param {{ variant?: 'standard' | 'simpler', signal?: AbortSignal, timeoutMs?: number }} [options]
 */
export function fetchLesson(topic, options = {}) {
  const variant = options.variant || "standard";
  return request("/api/teach", {
    method: "POST",
    body: { topic, variant },
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });
}

export function fetchRoadmapProgress() {
  return request("/api/roadmap/progress");
}

export function completeRoadmapTopic(topicId) {
  return request("/api/roadmap/progress/complete", {
    method: "POST",
    body: { topicId },
  });
}