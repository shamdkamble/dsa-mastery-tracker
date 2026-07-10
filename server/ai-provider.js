/**
 * AI provider routing (server-side)
 *
 * - Lessons, problem AI, general content: Gemini primary → Groq fallback
 * - Mantra Feed hooks: Groq primary → Gemini fallback (learning-fact-generator.js)
 * - Future notifications / small AI tasks: generateWithGroqPrimary()
 */

import {
  generateWithModelFallback,
  resolveApiKey,
  TeachApiError,
} from "./gemini.js";
import {
  generateWithGroq,
  isGroqConfigured,
  resolveGroqApiKey,
  resolveGroqModel,
} from "./groq.js";

const NO_GROQ_FALLBACK_CODES = new Set(["INVALID_INPUT", "SAFETY_BLOCK"]);
const NO_GEMINI_FALLBACK_CODES = new Set(["INVALID_INPUT"]);

function shouldFallbackFromGemini(err) {
  if (!(err instanceof TeachApiError)) return true;
  return !NO_GROQ_FALLBACK_CODES.has(err.code);
}

function shouldFallbackFromGroq(err) {
  if (!(err instanceof TeachApiError)) return true;
  return !NO_GEMINI_FALLBACK_CODES.has(err.code);
}

function tryResolveGeminiApiKey() {
  try {
    return resolveApiKey();
  } catch {
    return null;
  }
}

function noProviderError(geminiError, groqError) {
  return geminiError || groqError || new TeachApiError(
    "No AI provider available. Set GEMINI_API_KEY or GROQ_API_KEY.",
    { status: 503, code: "NO_AI_PROVIDER" },
  );
}

/**
 * Gemini primary, Groq fallback — lessons, problem AI, generateContent.
 */
export async function generateWithGeminiPrimary({
  userPrompt,
  options = {},
  systemPrompt = null,
  signal,
  onSuccess,
  validateResponse,
}) {
  let geminiError = null;
  const apiKey = tryResolveGeminiApiKey();

  if (apiKey) {
    try {
      const result = await generateWithModelFallback({
        apiKey,
        userPrompt,
        options,
        systemPrompt,
        signal,
        onSuccess: (model) => onSuccess?.({ provider: "gemini", model }),
        validateResponse,
      });
      return { ...result, provider: "gemini" };
    } catch (err) {
      if (!shouldFallbackFromGemini(err)) throw err;
      geminiError = err;
      console.warn(`[ai] Gemini failed (${err.message}) — trying Groq fallback`);
    }
  } else {
    console.warn("[ai] GEMINI_API_KEY not set — trying Groq");
  }

  if (!isGroqConfigured()) {
    throw noProviderError(geminiError, null);
  }

  const groqKey = resolveGroqApiKey();
  const groqResult = await generateWithGroq({
    apiKey: groqKey,
    userPrompt,
    systemPrompt,
    options: {
      ...options,
      model: options.groqModel || resolveGroqModel(),
    },
    signal,
    validateResponse,
  });

  onSuccess?.({ provider: "groq", model: groqResult.model });
  return { ...groqResult, provider: "groq" };
}

/**
 * Groq primary, Gemini fallback — notifications and small AI tasks.
 */
export async function generateWithGroqPrimary({
  userPrompt,
  options = {},
  systemPrompt = null,
  signal,
  onSuccess,
  validateResponse,
}) {
  let groqError = null;

  if (isGroqConfigured()) {
    try {
      const groqKey = resolveGroqApiKey();
      const groqResult = await generateWithGroq({
        apiKey: groqKey,
        userPrompt,
        systemPrompt,
        options: {
          ...options,
          model: options.groqModel || resolveGroqModel(),
        },
        signal,
        validateResponse,
      });
      onSuccess?.({ provider: "groq", model: groqResult.model });
      return { ...groqResult, provider: "groq" };
    } catch (err) {
      if (!shouldFallbackFromGroq(err)) throw err;
      groqError = err;
      console.warn(`[ai] Groq failed (${err.message}) — trying Gemini fallback`);
    }
  } else {
    console.warn("[ai] GROQ_API_KEY not set — trying Gemini");
  }

  const apiKey = tryResolveGeminiApiKey();
  if (!apiKey) {
    throw noProviderError(null, groqError);
  }

  const result = await generateWithModelFallback({
    apiKey,
    userPrompt,
    options,
    systemPrompt,
    signal,
    onSuccess: (model) => onSuccess?.({ provider: "gemini", model }),
    validateResponse,
  });
  return { ...result, provider: "gemini" };
}