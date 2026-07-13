/**
 * AI helpers for problem modal — pattern detection & complexity analysis
 */

import { TeachApiError } from "./gemini.js";
import { PATTERN_CATALOG } from "../js/storage/patterns-catalog.js";
import {
  extractSolutionCodeForAnalysis,
  isTrivialFakeCode,
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

const VALIDATE_CODE_SYSTEM = `You judge whether pasted text is real source code in any programming language (Python, JavaScript, TypeScript, Java, C++, C, Go, Rust, Kotlin, Swift, etc.).

Reject if the text is:
- Plain English, pseudocode, or approach notes
- Random words with stray braces/punctuation (e.g. "hello {}")
- Only punctuation or empty structure like "{}" or "();"
- Incomplete fragments that are not plausible syntax in any language
- Comments-only with no executable logic

Accept only if it is plausible source code: a function, class, method, or complete snippet in a recognizable language.

IMPORTANT: Reply with a single raw JSON object only. No markdown, no code fences, no commentary.

{
  "isValidCode": true,
  "language": "python",
  "reason": ""
}

If invalid, set isValidCode to false and give a short user-facing reason in reason. Leave language null when invalid.`;

const IDEAL_TIME_SYSTEM = `You estimate ideal solve time in minutes for a LeetCode-style DSA problem for a prepared interview candidate.

IMPORTANT: Reply with a single raw JSON object only. No markdown, no code fences, no commentary.

{
  "idealMinutes": 30,
  "rationale": "One short sentence"
}

Guidelines:
- Easy: typically 12-25 minutes
- Medium: typically 25-45 minutes
- Hard: typically 40-75 minutes
Adjust using title and topic tags. idealMinutes must be an integer from 5 to 120.`;

const DIFFICULTY_TIME_FALLBACK = { Easy: 20, Medium: 35, Hard: 50 };

const SUGGESTIONS_SYSTEM = `You review DSA solution code for a coding interview problem and suggest improvements when the approach is not optimal.

IMPORTANT: Reply with a single raw JSON object only. No markdown, no code fences, no commentary.

{
  "isOptimal": true,
  "summary": "One concise sentence",
  "suggestions": "Bullet-style improvement notes as plain text (use newlines). Empty string if already optimal.",
  "betterApproach": "Short note on a better pattern or technique, or empty if optimal"
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

  const validationFallback = extractJsonFields(cleaned, ["language", "reason"]);
  if (validationFallback && /"isValidCode"\s*:\s*true/i.test(cleaned)) {
    return { isValidCode: true, ...validationFallback };
  }
  if (validationFallback && /"isValidCode"\s*:\s*false/i.test(cleaned)) {
    return { isValidCode: false, ...validationFallback };
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

function parseValidationPayload(data) {
  const isValidCode = data?.isValidCode === true;
  const language = typeof data?.language === "string" && data.language.trim()
    ? data.language.trim()
    : null;
  const reason = typeof data?.reason === "string" ? data.reason.trim() : "";
  return { isValidCode, language, reason };
}

async function generateAndParseJson({ systemPrompt, userPrompt, options, provider = "gemini-primary" }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const aiProvider = await import("./ai-provider.js");
    const generate = provider === "groq-primary"
      ? aiProvider.generateWithGroqPrimary
      : aiProvider.generateWithGeminiPrimary;

    return await generate({
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

function buildInvalidCodeResult(reason) {
  return {
    isValidCode: false,
    language: null,
    reason: reason || "This doesn't look like real solution code.",
  };
}

export async function validateSolutionCode({ code }) {
  if (!code?.trim()) {
    throw new TeachApiError("Solution code is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const extracted = extractSolutionCodeForAnalysis(code);
  const candidate = extracted.code?.trim() || "";

  if (!candidate) {
    return buildInvalidCodeResult(
      extracted.reason === "prose"
        ? "Approach-style text belongs in My approach — paste solution code here."
        : "Paste your accepted solution code first.",
    );
  }

  if (candidate.length > 12_000) {
    throw new TeachApiError("Solution is too long to validate (max 12,000 characters).", {
      status: 400,
      code: "INVALID_INPUT",
    });
  }

  if (isTrivialFakeCode(candidate)) {
    return buildInvalidCodeResult("Add real solution code — braces or punctuation alone are not valid.");
  }

  const userPrompt = [
    "Is this valid source code in any programming language?",
    "```",
    candidate,
    "```",
  ].join("\n");

  const { parsed: data, model, usage, provider } = await generateAndParseJson({
    systemPrompt: VALIDATE_CODE_SYSTEM,
    userPrompt,
    provider: "groq-primary",
    options: { json: true, temperature: 0, maxTokens: 256, timeoutMs: 20_000 },
  });

  const result = parseValidationPayload(data);
  return {
    ...result,
    reason: result.isValidCode
      ? ""
      : (result.reason || "This doesn't look like real solution code in any language."),
    model,
    usage,
    provider,
  };
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

  const validation = await validateSolutionCode({ code: analyzable });
  if (!validation.isValidCode) {
    throw new TeachApiError(
      validation.reason || "Paste valid solution code before analyzing complexity.",
      { status: 400, code: "INVALID_CODE" },
    );
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
    provider: "groq-primary",
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

function clampIdealMinutes(value, difficulty) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isFinite(n) && n >= 5 && n <= 120) return n;
  const d = String(difficulty || "").trim();
  const exact = DIFFICULTY_TIME_FALLBACK[d];
  if (exact) return exact;
  const lower = d.toLowerCase();
  if (lower === "easy") return DIFFICULTY_TIME_FALLBACK.Easy;
  if (lower === "hard") return DIFFICULTY_TIME_FALLBACK.Hard;
  return DIFFICULTY_TIME_FALLBACK.Medium;
}

export async function estimateIdealSolveTime({ title, difficulty, topic, topicTags = [] }) {
  if (!title?.trim()) {
    throw new TeachApiError("Problem title is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const tags = Array.isArray(topicTags) ? topicTags.filter(Boolean) : [];
  const userPrompt = [
    `Problem: ${title.trim()}`,
    difficulty && `Difficulty: ${difficulty}`,
    topic && `Topic: ${topic}`,
    tags.length && `Tags: ${tags.join(", ")}`,
    "",
    "Estimate ideal solve time in minutes.",
  ].filter(Boolean).join("\n");

  try {
    const { parsed: data, model, usage } = await generateAndParseJson({
      systemPrompt: IDEAL_TIME_SYSTEM,
      userPrompt,
      provider: "groq-primary",
      options: { json: true, temperature: 0.2, maxTokens: 256, timeoutMs: 20_000 },
    });

    const idealMinutes = clampIdealMinutes(data?.idealMinutes, difficulty);
    return {
      idealMinutes,
      rationale: typeof data?.rationale === "string" ? data.rationale.trim() : "",
      model,
      usage,
    };
  } catch {
    return {
      idealMinutes: clampIdealMinutes(null, difficulty),
      rationale: "",
      model: null,
      usage: null,
      fallback: true,
    };
  }
}

export async function analyzeSolutionSuggestions({
  code,
  title,
  timeComplexity,
  spaceComplexity,
}) {
  if (!code?.trim()) {
    throw new TeachApiError("Solution code is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const extracted = extractSolutionCodeForAnalysis(code);
  if (!extracted.code || !looksLikeSolutionCode(extracted.code)) {
    throw new TeachApiError(
      "Paste valid solution code before requesting suggestions.",
      { status: 400, code: "INVALID_INPUT" },
    );
  }

  const analyzable = extracted.code.trim();
  const validation = await validateSolutionCode({ code: analyzable });
  if (!validation.isValidCode) {
    throw new TeachApiError(
      validation.reason || "Paste valid solution code first.",
      { status: 400, code: "INVALID_CODE" },
    );
  }

  const userPrompt = [
    title && `Problem: ${title.trim()}`,
    timeComplexity && `Reported time complexity: ${timeComplexity}`,
    spaceComplexity && `Reported space complexity: ${spaceComplexity}`,
    "",
    "Review this solution for optimality:",
    "```",
    analyzable,
    "```",
  ].filter(Boolean).join("\n");

  const { parsed: data, model, usage } = await generateAndParseJson({
    systemPrompt: SUGGESTIONS_SYSTEM,
    userPrompt,
    provider: "groq-primary",
    options: { json: true, temperature: 0.2, maxTokens: 768, timeoutMs: 45_000 },
  });

  const isOptimal = data?.isOptimal === true;
  const summary = typeof data?.summary === "string" ? data.summary.trim() : "";
  const suggestions = typeof data?.suggestions === "string" ? data.suggestions.trim() : "";
  const betterApproach = typeof data?.betterApproach === "string" ? data.betterApproach.trim() : "";

  const combined = [
    summary,
    !isOptimal && suggestions ? suggestions : "",
    !isOptimal && betterApproach ? `Better approach: ${betterApproach}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    isOptimal,
    summary,
    suggestions,
    betterApproach,
    combined: combined || (isOptimal ? "Your solution looks optimal for this problem." : ""),
    model,
    usage,
  };
}