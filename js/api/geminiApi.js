/**
 * Gemini API client — browser calls go through the local /api/teach proxy.
 *
 * Usage:
 *   import { teachTopic } from "./api/geminiApi.js";
 *   const { content } = await teachTopic({ name: "Two Pointers", track: "dsa" });
 */

import { API_BASE_URL } from "../config.js";
import { getToken } from "../auth/session.js";

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * @typedef {Object} TeachTopicInput
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [title]
 * @property {string} [description]
 * @property {number} [phase]
 * @property {string} [difficulty]
 * @property {"cpp" | "dsa" | string} [track]
 */

/**
 * @typedef {Object} TeachResponse
 * @property {string} content
 * @property {Object} [usage]
 * @property {string} [id]
 * @property {string} [model]
 */

export class TeachApiError extends Error {
  /**
   * @param {string} message
   * @param {Object} [meta]
   * @param {number} [meta.status]
   * @param {string} [meta.code]
   * @param {unknown} [meta.details]
   */
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "TeachApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {Response} res
 */
async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

/**
 * @param {number} status
 * @param {Object | null} data
 */
function errorFromResponse(status, data) {
  const apiMessage = typeof data?.error === "string"
    ? data.error
    : (data?.error?.message || data?.message || `Request failed (${status}).`);
  const code = data?.error?.code
    || (status === 400 ? "INVALID_INPUT"
    : status === 401 ? "UNAUTHORIZED"
    : status === 403 ? "FORBIDDEN"
    : status === 429 ? "RATE_LIMITED"
    : status === 501 ? "NOT_IMPLEMENTED"
    : status === 504 ? "TIMEOUT"
    : status >= 500 ? "SERVER_ERROR"
    : "API_ERROR");

  const hints = {
    MISSING_API_KEY: " Set GEMINI_API_KEY in your environment and restart the server.",
    RATE_LIMITED: " Wait a minute and try again, or check your Gemini API quota.",
    NOT_IMPLEMENTED: "",
    SERVER_ERROR: " Ensure the Node server is running (npm start).",
    NETWORK_ERROR: " Start the server with npm start instead of a static-only server.",
  };

  return new TeachApiError(`${apiMessage}${hints[code] || ""}`, {
    status,
    code,
    details: data,
  });
}

function resolveBaseUrl() {
  return API_BASE_URL?.replace(/\/$/, "") ?? "";
}

/**
 * Request an AI lesson for a topic via POST /api/teach.
 *
 * @param {string | TeachTopicInput} topic
 * @param {Object} [options]
 * @param {number} [options.timeoutMs]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<TeachResponse>}
 */
export async function teachTopic(topic, options = {}) {
  if (topic == null || (typeof topic === "string" && !topic.trim())) {
    throw new TeachApiError("topic is required.", { code: "INVALID_INPUT" });
  }

  const { fetchLesson } = await import("./teachApi.js");
  const variant = options.variant || "standard";
  const data = await fetchLesson(topic, { variant, signal: options.signal, timeoutMs: options.timeoutMs });

  if (!data?.content?.trim()) {
    throw new TeachApiError("Empty response from tutor.", { code: "EMPTY_RESPONSE", details: data });
  }

  return {
    content: data.content.trim(),
    usage: data.usage,
    id: data.id,
    model: data.model,
    cached: data.cached,
    hasSimpler: data.hasSimpler,
    variant: data.variant,
    topicId: data.topicId,
  };
}