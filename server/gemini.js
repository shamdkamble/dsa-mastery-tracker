/**
 * Server-side Gemini client (API key stays on the server)
 */

import "./env.js";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

/** Ordered fallback chain — primary first, then alternatives on rate limit / errors */
export const FALLBACK_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash-exp",
  "gemini-3.1-flash",
  "gemini-1.5-pro",
];

const RETRY_BASE_DELAY_MS = 600;
const RETRY_DELAY_INCREMENT_MS = 400;

/**
 * Resolve Gemini API base URL (strip accidental /models/... suffix from env)
 */
export function resolveBaseUrl() {
  const raw = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  return raw.replace(/\/$/, "").replace(/\/models\/[^/]+$/i, "");
}

/**
 * Normalize model id from env — must be "gemini-x.x-name", NOT "models/gemini-..."
 */
export function normalizeModelName(raw) {
  if (!raw || typeof raw !== "string") return DEFAULT_GEMINI_MODEL;

  let model = raw.replace(/^\uFEFF/, "").trim();
  model = model.replace(/^["']|["']$/g, "");
  model = model.replace(/^models\//i, "");

  if (!model || !/^gemini-[\w.-]+$/i.test(model)) {
    return DEFAULT_GEMINI_MODEL;
  }

  return model;
}

export function resolveModel() {
  return normalizeModelName(process.env.GEMINI_MODEL);
}
const DEFAULT_TIMEOUT_MS = 120_000;

export const TEACHING_SYSTEM_PROMPT = `You are an expert computer science tutor in the DSA Mastery Tracker app. Your student is preparing for FAANG-level technical interviews.

You MUST structure every lesson using EXACTLY these four markdown section headings (include the numbers):

## 1. History & Problem it Solved
## 2. Real Life Analogy
## 3. Technical Explanation & Complexity
## 4. C++ Code Examples

Rules:
- Write clear, engaging prose under each section — no skipping sections.
- Section 1: historical context, why this concept exists, what problem it solves.
- Section 2: one concrete, memorable real-world analogy.
- Section 3: technical depth, how it works, time/space complexity where relevant, edge cases. Focus on C++ implementation details.
- Section 4: clean, interview-ready C++ code in fenced \`\`\`cpp blocks with brief comments.
- Prefer C++ STL (vector, unordered_map, string, algorithm) for examples.
- Connect to LeetCode/interview patterns when relevant.
- Tone: encouraging, precise, practical. No filler.`;

export class TeachApiError extends Error {
  constructor(message, { status = 500, code = "SERVER_ERROR", details } = {}) {
    super(message);
    this.name = "TeachApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalize and validate the Gemini API key from environment / .env
 */
export function resolveApiKey() {
  const raw = process.env.GEMINI_API_KEY;
  if (!raw) {
    throw new TeachApiError(
      "Missing GEMINI_API_KEY. Add it to .env or set the environment variable, then restart the server.",
      { status: 500, code: "MISSING_API_KEY" },
    );
  }

  const key = raw.replace(/^\uFEFF/, "").trim();

  if (!key) {
    throw new TeachApiError(
      "GEMINI_API_KEY is empty. Check your .env file and restart the server.",
      { status: 500, code: "MISSING_API_KEY" },
    );
  }

  return key;
}

function topicName(topic) {
  return topic.name?.trim() || topic.title?.trim() || "";
}

function buildUserPrompt(topic) {
  if (typeof topic === "string") {
    return [
      `Create a structured lesson for: **${topic.trim()}**`,
      "",
      "Follow the four required sections from your system instructions.",
    ].join("\n");
  }

  if (topic && typeof topic === "object") {
    const name = topicName(topic) || "this topic";
    const phase = topic.phase ? `Phase ${topic.phase}` : "";
    const difficulty = topic.difficulty ? `Difficulty: ${topic.difficulty}` : "";
    const track = topic.track ? `Track: ${topic.track.toUpperCase()}` : "";
    const meta = [phase, difficulty, track].filter(Boolean).join(" · ");

    return [
      `Create a structured lesson for: **${name}**`,
      meta && `Context: ${meta}`,
      topic.description?.trim() && `Notes: ${topic.description.trim()}`,
      "",
      "Follow the four required sections from your system instructions.",
      "Make the lesson appropriately challenging for the stated difficulty.",
    ].filter(Boolean).join("\n");
  }

  throw new TeachApiError("topic must be a string or object.", { status: 400, code: "INVALID_INPUT" });
}

function validateTopic(topic) {
  if (topic == null) {
    throw new TeachApiError("topic is required.", { status: 400, code: "INVALID_INPUT" });
  }
  if (typeof topic === "string" && !topic.trim()) {
    throw new TeachApiError("topic must be a non-empty string.", { status: 400, code: "INVALID_INPUT" });
  }
  if (typeof topic === "object") {
    const name = topicName(topic);
    if (!name && !topic.description?.trim()) {
      throw new TeachApiError("topic object needs a name or description.", { status: 400, code: "INVALID_INPUT" });
    }
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

function parseApiErrorMessage(data, status) {
  if (!data) return `Gemini API request failed (${status}).`;

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  if (data.error?.message) {
    return data.error.message;
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  return `Gemini API request failed (${status}).`;
}

function errorFromResponse(status, data) {
  const apiMessage = parseApiErrorMessage(data, status);
  const apiCode = data?.error?.code || data?.error?.status;

  let code = "API_ERROR";
  if (status === 401 || status === 403) code = "UNAUTHORIZED";
  else if (status === 429) code = "RATE_LIMITED";
  else if (status === 404) code = "MODEL_NOT_FOUND";
  else if (status >= 500) code = "SERVER_ERROR";

  return new TeachApiError(apiMessage, { status, code, details: data });
}

function buildGenerateUrl(model) {
  const base = resolveBaseUrl();
  const id = normalizeModelName(model);
  return `${base}/models/${id}:generateContent`;
}

function buildRequestBody(userPrompt, options = {}) {
  return buildGenericRequestBody(TEACHING_SYSTEM_PROMPT, userPrompt, {
    temperature: options.temperature ?? 0.6,
    maxTokens: options.maxTokens ?? 4096,
    ...options,
  });
}

function buildGenericRequestBody(systemPrompt, userPrompt, options = {}) {
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxTokens ?? 1024,
      topP: 0.95,
    },
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  if (options.json) {
    body.generationConfig.responseMimeType = "application/json";
  }

  return body;
}

function extractContent(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attemptIndex) {
  return RETRY_BASE_DELAY_MS + attemptIndex * RETRY_DELAY_INCREMENT_MS;
}

function isRetryableError(status, data) {
  if (status === 401 || status === 403) return false;
  if (status === 429 || status === 404 || status >= 500) return true;

  const msg = parseApiErrorMessage(data, status).toLowerCase();

  if (status === 400) {
    return (
      msg.includes("model")
      || msg.includes("not found")
      || msg.includes("unexpected")
      || msg.includes("quota")
      || msg.includes("rate")
      || msg.includes("resource")
      || msg.includes("unavailable")
    );
  }

  return false;
}

function resolveModelsToTry(options = {}) {
  const rawModel = options.model || process.env.GEMINI_MODEL;
  const primaryModel = normalizeModelName(rawModel || resolveModel());

  if (rawModel) {
    const cleaned = rawModel.replace(/^\uFEFF/, "").trim().replace(/^["']|["']$/g, "").replace(/^models\//i, "");
    if (normalizeModelName(rawModel) !== cleaned) {
      console.warn(`[gemini] normalized invalid GEMINI_MODEL "${rawModel}" → "${primaryModel}"`);
    }
  }

  return [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];
}

/**
 * Try Gemini models in order with a short delay between retries on rate limits / transient errors.
 * @param {{ apiKey: string, userPrompt: string, options?: object, systemPrompt?: string | null, signal: AbortSignal, onSuccess?: (model: string) => void }} params
 */
export async function generateWithModelFallback({
  apiKey,
  userPrompt,
  options = {},
  systemPrompt = null,
  signal,
  onSuccess,
}) {
  const modelsToTry = resolveModelsToTry(options);
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];

    if (i > 0) {
      const delay = getRetryDelayMs(i - 1);
      console.warn(`[gemini] waiting ${delay}ms before trying ${model}...`);
      await sleep(delay);
    }

    const result = await callGemini(model, apiKey, userPrompt, options, signal, systemPrompt);

    if (result.ok) {
      if (i > 0) {
        console.log(`[gemini] succeeded with fallback model ${model}`);
      }
      onSuccess?.(result.model);
      return {
        content: result.content,
        usage: result.usage,
        model: result.model,
      };
    }

    if (isRetryableError(result.status, result.data)) {
      console.warn(
        `[gemini] model ${model} failed (${result.status}): ${parseApiErrorMessage(result.data, result.status)} — trying next...`,
      );
      lastError = errorFromResponse(result.status, result.data);
      continue;
    }

    console.error(`[gemini] ${result.status} ${model}:`, parseApiErrorMessage(result.data, result.status));
    throw errorFromResponse(result.status, result.data);
  }

  throw lastError || new TeachApiError("All Gemini models exhausted.", { status: 502, code: "MODEL_NOT_FOUND" });
}

async function callGemini(model, apiKey, userPrompt, options, signal, systemPrompt = null) {
  const modelId = normalizeModelName(model);
  const url = buildGenerateUrl(modelId);
  const requestBody = systemPrompt != null
    ? buildGenericRequestBody(systemPrompt, userPrompt, options)
    : buildRequestBody(userPrompt, options);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    return { ok: false, status: res.status, data, model };
  }

  const content = extractContent(data);
  const blockReason = data?.candidates?.[0]?.finishReason;

  if (blockReason === "SAFETY") {
    throw new TeachApiError("Gemini blocked the response due to safety filters. Try a different topic.", {
      status: 502,
      code: "SAFETY_BLOCK",
      details: data,
    });
  }

  if (!content) {
    throw new TeachApiError("Gemini returned an empty response.", {
      status: 502,
      code: "EMPTY_RESPONSE",
      details: data,
    });
  }

  return {
    ok: true,
    content,
    usage: data.usageMetadata,
    model: modelId,
    id: data?.candidates?.[0]?.finishReason,
  };
}

/**
 * @param {string | object} topic
 * @param {Object} [options]
 */
/**
 * Generic Gemini content generation with optional custom system prompt.
 * @param {{ systemPrompt?: string, userPrompt: string, options?: object }} params
 */
export async function generateContent({ systemPrompt = null, userPrompt, options = {} }) {
  if (!userPrompt?.trim()) {
    throw new TeachApiError("userPrompt is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const apiKey = resolveApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);

  try {
    return await generateWithModelFallback({
      apiKey,
      userPrompt,
      options,
      systemPrompt,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof TeachApiError) throw err;
    if (err?.name === "AbortError") {
      throw new TeachApiError("Request timed out.", { status: 504, code: "TIMEOUT" });
    }
    throw new TeachApiError(err?.message || "Unexpected error calling Gemini.", { status: 500, code: "UNKNOWN" });
  } finally {
    clearTimeout(timeout);
  }
}

export async function teachTopic(topic, options = {}) {
  validateTopic(topic);

  const apiKey = resolveApiKey();
  const userPrompt = buildUserPrompt(topic);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    return await generateWithModelFallback({
      apiKey,
      userPrompt,
      options,
      signal: controller.signal,
      onSuccess: (model) => console.log(`[gemini] lesson generated with ${model}`),
    });
  } catch (err) {
    if (err instanceof TeachApiError) throw err;
    if (err?.name === "AbortError") {
      throw new TeachApiError("Request timed out.", { status: 504, code: "TIMEOUT" });
    }
    throw new TeachApiError(err?.message || "Unexpected error calling Gemini.", { status: 500, code: "UNKNOWN" });
  } finally {
    clearTimeout(timeout);
  }
}