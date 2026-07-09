/**
 * Server-side Gemini client (API key stays on the server)
 */

import "./env.js";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Valid Gemini models for v1beta generateContent (verified via ListModels).
 * Invalid env values map to DEFAULT_GEMINI_MODEL.
 */
export const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-3-flash-preview",
];

const ALLOWED_MODELS = new Set(FALLBACK_MODELS);

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

  if (!model || !/^gemini-[\w.-]+$/i.test(model) || !ALLOWED_MODELS.has(model)) {
    if (model && /^gemini-[\w.-]+$/i.test(model)) {
      console.warn(`[gemini] unsupported model "${model}" → "${DEFAULT_GEMINI_MODEL}"`);
    }
    return DEFAULT_GEMINI_MODEL;
  }

  return model;
}

export function resolveModel() {
  return normalizeModelName(process.env.GEMINI_MODEL);
}
const DEFAULT_TIMEOUT_MS = 120_000;

export const MIN_LESSON_SECTIONS = 4;

export const BANNED_LESSON_PHRASES = [
  "hello there",
  "hey there",
  "welcome to",
  "let's get started",
  "let's dive",
  "let us dive",
  "sure, let",
  "absolutely critical",
  "absolutely crucial",
  "in this section",
  "in conclusion",
  "to summarize",
  "it's worth noting",
  "it is worth noting",
  "great question",
  "i'd be happy to",
  "i would be happy to",
];

export const REQUIRED_LESSON_SECTION_HEADINGS = [
  "## Why It Was Invented",
  "## Core Idea & How It Works",
  "## Where It Is Used in Real World",
  "## Simple Implementation",
];

export const TEACHING_SYSTEM_PROMPT = `You are a warm, patient mentor in the DSA Mastery Tracker app. You teach one curious beginner who knows nothing about coding yet — explain like you would to a smart kid who is eager to learn.

Voice and tone:
- Warm, encouraging, and clear. Never condescending.
- Address the student as "you". Occasional first-person is fine ("Here's how I like to think about it…").
- Start immediately with the first section heading — no greeting, no preamble, no chatbot filler.
- Never use generic AI phrases: no "Hello there!", "Let's get started!", "Sure, let's dive into…", "Absolutely critical", "In this section we will…", or similar filler.

You MUST use EXACTLY these four markdown headings (copy them character-for-character):

## Why It Was Invented
## Core Idea & How It Works
## Where It Is Used in Real World
## Simple Implementation

Content under each heading:

**Why It Was Invented** — History & the problem it solved:
- What real-world problem existed before this concept?
- Why did humans need to create it?
- What big improvement did it bring?

**Core Idea & How It Works**:
- Start with a simple real-life analogy.
- Then give a clear, plain definition.
- Step-by-step explanation of how it actually works.

**Where It Is Used in Real World**:
- Real examples from websites, software, companies, or daily life.
- Why it matters in FAANG interviews and the tech industry.

**Simple Implementation**:
- Small, easy-to-understand C++ examples in fenced \`\`\`cpp blocks.
- Start with the simplest version, then a slightly better one.
- Brief comments on every important line.

Quality rules:
- Every section needs multiple paragraphs — never a single sentence.
- Use everyday words first; introduce technical terms only when needed and explain them.
- No filler, no repetition across sections.`;

export const SIMPLER_TEACHING_SYSTEM_PROMPT = `You are a patient mentor rewriting a lesson for a complete beginner in the DSA Mastery Tracker app — explain like to a smart kid who knows nothing about coding.

You receive a complete standard lesson. Rewrite the ENTIRE lesson in even simpler words while keeping the same structure and warmth.

Voice and tone:
- Extra simple: shorter sentences, everyday vocabulary, zero jargon without explanation.
- Warm and encouraging — never condescending.
- No generic AI phrases (no greetings, no "Let's dive in", no filler).
- Start directly with "## Why It Was Invented" — no intro before it.

You MUST use EXACTLY these four markdown headings (copy them character-for-character):

## Why It Was Invented
## Core Idea & How It Works
## Where It Is Used in Real World
## Simple Implementation

Rewrite rules:
- Rewrite every paragraph under each heading — same facts, same code, simpler words.
- Keep the same four-part flow: history → analogy + how it works → real-world uses → simple C++ code.
- Keep all \`\`\`cpp code examples; add extra brief comments so a beginner can follow line by line.
- Never skip, merge, or shorten a section to just one sentence.`;

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
      `Teach **${topic.trim()}** to a complete beginner.`,
      "",
      "Follow the four required ## headings from your system instructions exactly.",
      "Explain like to a smart kid — warm, clear, no preamble.",
    ].join("\n");
  }

  if (topic && typeof topic === "object") {
    const name = topicName(topic) || "this topic";
    const phase = topic.phase ? `Phase ${topic.phase}` : "";
    const difficulty = topic.difficulty ? `Difficulty: ${topic.difficulty}` : "";
    const track = topic.track ? `Track: ${topic.track.toUpperCase()}` : "";
    const meta = [phase, difficulty, track].filter(Boolean).join(" · ");

    return [
      `Teach **${name}** to a complete beginner.`,
      meta && `Context: ${meta}`,
      topic.description?.trim() && `Notes: ${topic.description.trim()}`,
      "",
      "Follow the four required ## headings from your system instructions exactly.",
      "Explain like to a smart kid — warm, clear, no preamble.",
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
 * @param {{ apiKey: string, userPrompt: string, options?: object, systemPrompt?: string | null, signal: AbortSignal, onSuccess?: (model: string) => void, validateResponse?: (content: string) => unknown }} params
 */
export async function generateWithModelFallback({
  apiKey,
  userPrompt,
  options = {},
  systemPrompt = null,
  signal,
  onSuccess,
  validateResponse,
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
      if (validateResponse) {
        try {
          const parsed = validateResponse(result.content);
          if (i > 0) {
            console.log(`[gemini] succeeded with fallback model ${model}`);
          }
          onSuccess?.(result.model);
          return {
            content: result.content,
            parsed,
            usage: result.usage,
            model: result.model,
          };
        } catch (validationErr) {
          const retryable = validationErr instanceof TeachApiError
            && ["PARSE_ERROR", "EMPTY_RESPONSE", "INVALID_STRUCTURE"].includes(validationErr.code);

          if (retryable) {
            console.warn(`[gemini] model ${model} returned unparseable response — trying next...`);
            lastError = validationErr;
            continue;
          }

          throw validationErr;
        }
      }

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

  throw lastError || new TeachApiError(
    "All Gemini models are unavailable right now. Try again in a few minutes or fill in manually.",
    { status: 502, code: "MODEL_NOT_FOUND" },
  );
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

export function extractLessonHeadings(content) {
  const matches = content.match(/^##\s+(.+)$/gm) || [];
  return matches.map((heading) => heading.replace(/^##\s+/, "").trim());
}

function missingRequiredHeadings(content) {
  return REQUIRED_LESSON_SECTION_HEADINGS.filter((heading) => !content.includes(heading));
}

function hasGenericHeading(headings) {
  return headings.some((heading) => (
    /^section\s*\d+/i.test(heading)
    || /^\d+\.\s/.test(heading)
  ));
}

function hasBannedPhrases(content) {
  const sample = content.slice(0, 600).toLowerCase();
  return BANNED_LESSON_PHRASES.some((phrase) => sample.includes(phrase));
}

function hasSignificantPreamble(content) {
  const firstHeading = content.search(/^##\s+/m);
  if (firstHeading <= 0) return false;
  return content.slice(0, firstHeading).trim().length > 30;
}

export function isCompleteLesson(content) {
  if (!content?.trim()) return false;

  if (missingRequiredHeadings(content).length > 0) return false;

  const headings = extractLessonHeadings(content);
  if (headings.length < MIN_LESSON_SECTIONS) return false;
  if (!/```(?:cpp|c\+\+)?[\s\S]*?```/i.test(content)) return false;
  if (hasGenericHeading(headings)) return false;
  if (hasSignificantPreamble(content)) return false;

  return true;
}

function validateLessonStructure(content) {
  if (!content?.trim()) {
    throw new TeachApiError("Gemini returned an empty response.", {
      status: 502,
      code: "EMPTY_RESPONSE",
    });
  }

  const headings = extractLessonHeadings(content);
  const missing = missingRequiredHeadings(content);

  if (missing.length > 0) {
    throw new TeachApiError(
      `Lesson is missing required sections: ${missing.join(", ")}`,
      { status: 502, code: "INVALID_STRUCTURE" },
    );
  }

  if (headings.length < MIN_LESSON_SECTIONS) {
    throw new TeachApiError(
      `Lesson needs at least ${MIN_LESSON_SECTIONS} ## sections (found ${headings.length}).`,
      { status: 502, code: "INVALID_STRUCTURE" },
    );
  }

  if (!/```(?:cpp|c\+\+)?[\s\S]*?```/i.test(content)) {
    throw new TeachApiError("Lesson is missing a C++ code block.", {
      status: 502,
      code: "INVALID_STRUCTURE",
    });
  }

  if (hasGenericHeading(headings)) {
    throw new TeachApiError("Lesson uses generic numbered section headings.", {
      status: 502,
      code: "INVALID_STRUCTURE",
    });
  }

  if (hasSignificantPreamble(content)) {
    throw new TeachApiError("Lesson must start with the first section heading — no preamble.", {
      status: 502,
      code: "INVALID_STRUCTURE",
    });
  }

  if (hasBannedPhrases(content)) {
    throw new TeachApiError("Lesson contains generic AI filler phrases.", {
      status: 502,
      code: "INVALID_STRUCTURE",
    });
  }
}

function buildSimplerUserPrompt(topic, standardContent) {
  const name = topicName(topic) || "this topic";
  const headingList = REQUIRED_LESSON_SECTION_HEADINGS.map((heading) => `- ${heading}`).join("\n");

  return [
    `Rewrite the ENTIRE lesson below for **${name}** in even simpler words.`,
    "Explain like to a smart kid who knows nothing about coding.",
    "Keep these exact section headings:",
    headingList,
    "Rewrite every paragraph under each heading — do not write only a short introduction.",
    "Keep all C++ code examples; add extra brief comments so beginners can follow.",
    "",
    "Original lesson:",
    standardContent.trim(),
  ].join("\n");
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
      options: {
        ...options,
        maxTokens: options.maxTokens ?? 4096,
      },
      signal: controller.signal,
      validateResponse: validateLessonStructure,
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

export async function teachTopicSimpler(topic, standardContent, options = {}) {
  validateTopic(topic);

  if (!standardContent?.trim()) {
    throw new TeachApiError("Standard lesson content is required to simplify.", { status: 400, code: "INVALID_INPUT" });
  }

  const apiKey = resolveApiKey();
  const userPrompt = buildSimplerUserPrompt(topic, standardContent);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    return await generateWithModelFallback({
      apiKey,
      userPrompt,
      options: {
        ...options,
        temperature: options.temperature ?? 0.5,
        maxTokens: options.maxTokens ?? 4096,
      },
      systemPrompt: SIMPLER_TEACHING_SYSTEM_PROMPT,
      signal: controller.signal,
      validateResponse: validateLessonStructure,
      onSuccess: (model) => console.log(`[gemini] simpler lesson generated with ${model}`),
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