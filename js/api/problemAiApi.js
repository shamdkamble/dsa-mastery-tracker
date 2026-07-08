/**
 * Problem modal AI — pattern detection & complexity analysis via server proxy
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";

export class ProblemAiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ProblemAiError";
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
  const code = data?.error?.code || "API_ERROR";

  const hints = {
    MISSING_API_KEY: " Set GEMINI_API_KEY and restart the server.",
    RATE_LIMITED: " Wait a moment and try again.",
    NETWORK_ERROR: " Run the server with npm start.",
  };

  return new ProblemAiError(`${apiMessage}${hints[code] ? hints[code] : ""}`, {
    status,
    code,
    details: data,
  });
}

function resolveBaseUrl() {
  return API_BASE_URL?.replace(/\/$/, "") ?? "";
}

async function postProblemAi(path, body, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);

  try {
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${resolveBaseUrl()}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal ?? controller.signal,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) throw errorFromResponse(res.status, data);
    return data;
  } catch (err) {
    if (err instanceof ProblemAiError) throw err;
    if (err?.name === "AbortError") {
      throw new ProblemAiError("Request timed out.", { code: "TIMEOUT" });
    }
    if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
      throw new ProblemAiError("Cannot reach the API. Run npm start.", { code: "NETWORK_ERROR" });
    }
    throw new ProblemAiError(err?.message || "Unexpected error.", { code: "UNKNOWN", details: err });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {{ title: string, difficulty?: string, topic?: string, topicTags?: string[] }} input
 */
export function detectPattern(input) {
  return postProblemAi("/api/problem/detect-pattern", input);
}

/**
 * @param {{ code: string, title?: string }} input
 */
export function analyzeComplexity(input) {
  return postProblemAi("/api/problem/analyze-complexity", input);
}