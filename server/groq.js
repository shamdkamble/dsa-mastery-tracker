/**
 * Groq API client (OpenAI-compatible) — used for Mantra Feed hook generation
 */

import { TeachApiError } from "./gemini.js";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
export const DEFAULT_GROQ_HOOKS_MODEL = "llama-3.3-70b-versatile";

export function isGroqConfigured() {
  const raw = process.env.GROQ_API_KEY;
  return Boolean(raw && String(raw).trim());
}

export function resolveGroqApiKey() {
  const raw = process.env.GROQ_API_KEY;
  if (!raw) {
    throw new TeachApiError(
      "GROQ_API_KEY is not configured. Add it in Vercel environment variables.",
      { status: 503, code: "GROQ_NOT_CONFIGURED" },
    );
  }

  const key = String(raw).replace(/^\uFEFF/, "").trim();
  if (!key) {
    throw new TeachApiError("GROQ_API_KEY is empty.", { status: 503, code: "GROQ_NOT_CONFIGURED" });
  }

  return key;
}

export function resolveGroqHooksModel() {
  return (process.env.GROQ_HOOKS_MODEL || DEFAULT_GROQ_HOOKS_MODEL).trim();
}

function groqErrorFromResponse(status, data) {
  const message = data?.error?.message || `Groq API request failed (${status}).`;
  let code = "GROQ_FAILED";
  if (status === 429) code = "GROQ_RATE_LIMITED";
  else if (status === 401 || status === 403) code = "GROQ_UNAUTHORIZED";

  return new TeachApiError(message, {
    status: status >= 400 && status < 600 ? status : 502,
    code,
    details: data,
  });
}

/**
 * @param {{ apiKey: string, userPrompt: string, systemPrompt?: string, options?: object, signal?: AbortSignal, validateResponse?: (content: string) => unknown }} params
 */
export async function generateWithGroq({
  apiKey,
  userPrompt,
  systemPrompt = null,
  options = {},
  signal,
  validateResponse,
}) {
  const model = options.model || resolveGroqHooksModel();

  const body = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: userPrompt },
    ],
    temperature: options.temperature ?? 0.85,
    max_tokens: options.maxTokens ?? 8192,
  };

  if (options.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw groqErrorFromResponse(res.status, data);
  }

  const content = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!content) {
    throw new TeachApiError("Groq returned an empty response.", {
      status: 502,
      code: "EMPTY_RESPONSE",
      details: data,
    });
  }

  if (validateResponse) {
    try {
      const parsed = validateResponse(content);
      return { content, parsed, model, usage: data?.usage || null };
    } catch (err) {
      if (err instanceof TeachApiError) throw err;
      throw new TeachApiError("Could not parse Groq JSON response.", {
        status: 502,
        code: "PARSE_ERROR",
        details: { message: err?.message },
      });
    }
  }

  return { content, parsed: null, model, usage: data?.usage || null };
}