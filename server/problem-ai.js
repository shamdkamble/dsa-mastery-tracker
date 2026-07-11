/**
 * AI helpers for problem modal — pattern detection & complexity analysis
 */

import { TeachApiError } from "./gemini.js";
import { PATTERN_CATALOG } from "../js/storage/patterns-catalog.js";
import {
  extractSolutionCodeForAnalysis,
  looksLikeSolutionCode,
} from "./solution-code.js";

const PATTERN_NAMES = PATTERN_CATALOG.map((p) => p.name);

const PATTERN_SYSTEM = `You are a DSA expert. Identify the primary algorithmic pattern for LeetCode problems.
Choose patterns ONLY from this exact list:
${PATTERN_NAMES.join(", ")}

IMPORTANT: Reply with a single raw JSON object only. No markdown, no code fences, no commentary.

{
  "primary": "Exact pattern name from the list",
  "alternatives": ["Other pattern from the list"],
  "confidence": "high",
  "reasoning": "One concise sentence"
}`;

const COMPLEXITY_SYSTEM = `You analyze solution code and report time and space complexity in Big-O notation.

IMPORTANT: Reply with a single raw JSON object only. No markdown, no code fences, no commentary.

{
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "explanation": "One or two sentences explaining why"
}`;

function stripCodeFences(text) {
  let raw = text.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();
  return raw.replace(/^\s*json\s*/i, "").trim();
}

function extractJsonSubstring(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function fixTrailingCommas(json) {
  return json.replace(/,\s*([}\]])/g, "$1");
}

function tryParseJsonObject(text) {
  const candidates = [
    text,
    extractJsonSubstring(text),
    fixTrailingCommas(text),
    fixTrailingCommas(extractJsonSubstring(text)),
  ];

  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);

    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

function extractQuotedField(text, field) {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i");
  const match = text.match(re);
  return match ? match[1].replace(/\\"/g, '"').trim() : null;
}

function extractJsonFields(text, fields) {
  const result = {};
  for (const field of fields) {
    const value = extractQuotedField(text, field);
    if (value) result[field] = value;
  }
  return Object.keys(result).length ? result : null;
}

function parseJsonContent(text) {
  if (!text?.trim()) {
    throw new TeachApiError("Empty AI response.", { status: 502, code: "EMPTY_RESPONSE" });
  }

  const cleaned = stripCodeFences(text);
  const parsed = tryParseJsonObject(cleaned) || tryParseJsonObject(stripCodeFences(cleaned));
  if (parsed) return parsed;

  const patternFallback = extractJsonFields(cleaned, ["primary", "reasoning", "confidence"]);
  if (patternFallback?.primary) return patternFallback;

  const complexityFallback = extractJsonFields(cleaned, ["timeComplexity", "spaceComplexity", "explanation"]);
  if (complexityFallback?.timeComplexity || complexityFallback?.spaceComplexity) {
    return complexityFallback;
  }

  throw new TeachApiError(
    "AI returned an unreadable response. You can fill in the fields manually.",
    { status: 502, code: "PARSE_ERROR" },
  );
}

function normalizePatternName(name) {
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim();

  const exact = PATTERN_NAMES.find((p) => p.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  const partial = PATTERN_NAMES.find((p) => {
    const lower = p.toLowerCase();
    const input = trimmed.toLowerCase();
    return lower.includes(input) || input.includes(lower);
  });

  return partial || null;
}

async function generateAndParseJson({ systemPrompt, userPrompt, options }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const { generateWithGeminiPrimary } = await import("./ai-provider.js");
    return await generateWithGeminiPrimary({
      userPrompt,
      options,
      systemPrompt,
      signal: controller.signal,
      validateResponse: parseJsonContent,
    });
  } catch (err) {
    if (err instanceof TeachApiError) throw err;
    if (err?.name === "AbortError") {
      throw new TeachApiError("Request timed out.", { status: 504, code: "TIMEOUT" });
    }
    throw new TeachApiError(err?.message || "Unexpected error calling AI.", { status: 500, code: "UNKNOWN" });
  } finally {
    clearTimeout(timeout);
  }
}

export async function detectProblemPattern({ title, difficulty, topic, topicTags = [] }) {
  if (!title?.trim()) {
    throw new TeachApiError("Problem title is required for pattern detection.", { status: 400, code: "INVALID_INPUT" });
  }

  const tags = Array.isArray(topicTags) ? topicTags.filter(Boolean) : [];
  const userPrompt = [
    `Problem: ${title.trim()}`,
    difficulty && `Difficulty: ${difficulty}`,
    topic && `Topics: ${topic}`,
    tags.length && `Tags: ${tags.join(", ")}`,
    "",
    "What is the primary DSA pattern for solving this problem?",
  ].filter(Boolean).join("\n");

  const { parsed: data, model, usage } = await generateAndParseJson({
    systemPrompt: PATTERN_SYSTEM,
    userPrompt,
    options: { json: true, temperature: 0.2, maxTokens: 512, timeoutMs: 45_000 },
  });

  const primary = normalizePatternName(data.primary);

  if (!primary) {
    throw new TeachApiError(
      "AI could not match a known pattern. Select one manually from the dropdown.",
      { status: 502, code: "INVALID_PATTERN" },
    );
  }

  const alternatives = (Array.isArray(data.alternatives) ? data.alternatives : [])
    .map(normalizePatternName)
    .filter(Boolean)
    .filter((p) => p !== primary)
    .slice(0, 2);

  return {
    primary,
    alternatives,
    confidence: data.confidence || "medium",
    reasoning: typeof data.reasoning === "string" ? data.reasoning.trim() : "",
    model,
    usage,
  };
}

export async function analyzeSolutionComplexity({ code, title }) {
  if (!code?.trim()) {
    throw new TeachApiError("Solution code is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const extracted = extractSolutionCodeForAnalysis(code);

  if (!extracted.code || !looksLikeSolutionCode(extracted.code)) {
    throw new TeachApiError(
      extracted.reason === "prose"
        ? "Paste solution code in the code field — approach notes are analyzed separately and prose skews complexity results."
        : "Could not find analyzable solution code. Paste your accepted code or wrap it in a markdown code block.",
      { status: 400, code: "INVALID_INPUT" },
    );
  }

  const analyzable = extracted.code.trim();

  if (analyzable.length > 12_000) {
    throw new TeachApiError("Solution is too long to analyze (max 12,000 characters).", {
      status: 400,
      code: "INVALID_INPUT",
    });
  }

  const userPrompt = [
    title && `Problem: ${title.trim()}`,
    extracted.stripped ? "Note: Non-code notes were stripped — analyze only the solution below." : "",
    "",
    "Analyze this solution:",
    "```",
    analyzable,
    "```",
  ].filter((line) => line !== false && line !== "").join("\n");

  const { parsed: data, model, usage } = await generateAndParseJson({
    systemPrompt: COMPLEXITY_SYSTEM,
    userPrompt,
    options: { json: true, temperature: 0.1, maxTokens: 512, timeoutMs: 45_000 },
  });

  const timeComplexity = data.timeComplexity?.trim();
  const spaceComplexity = data.spaceComplexity?.trim();

  if (!timeComplexity || !spaceComplexity) {
    throw new TeachApiError(
      "AI could not determine complexity. Enter time and space values manually.",
      { status: 502, code: "INVALID_COMPLEXITY" },
    );
  }

  return {
    timeComplexity,
    spaceComplexity,
    explanation: typeof data.explanation === "string" ? data.explanation.trim() : "",
    model,
    usage,
  };
}