/**
 * AI helpers for problem modal — pattern detection & complexity analysis
 */

import { generateContent, TeachApiError } from "./gemini.js";
import { PATTERN_CATALOG } from "../js/storage/patterns-catalog.js";

const PATTERN_NAMES = PATTERN_CATALOG.map((p) => p.name);

const PATTERN_SYSTEM = `You are a DSA expert. Identify the primary algorithmic pattern for LeetCode problems.
Choose patterns ONLY from this exact list:
${PATTERN_NAMES.join(", ")}

Respond with valid JSON only:
{
  "primary": "Exact pattern name from the list",
  "alternatives": ["Other pattern from the list"],
  "confidence": "high" | "medium" | "low",
  "reasoning": "One concise sentence"
}`;

const COMPLEXITY_SYSTEM = `You analyze solution code and report time and space complexity in Big-O notation.
Respond with valid JSON only:
{
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "explanation": "One or two sentences explaining why"
}`;

function parseJsonContent(text) {
  if (!text?.trim()) {
    throw new TeachApiError("Empty AI response.", { status: 502, code: "EMPTY_RESPONSE" });
  }

  let raw = text.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();

  try {
    return JSON.parse(raw);
  } catch {
    throw new TeachApiError("Could not parse AI response. Try again.", { status: 502, code: "PARSE_ERROR" });
  }
}

function normalizePatternName(name) {
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim();
  const exact = PATTERN_NAMES.find((p) => p.toLowerCase() === trimmed.toLowerCase());
  return exact || null;
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

  const { content, model, usage } = await generateContent({
    systemPrompt: PATTERN_SYSTEM,
    userPrompt,
    options: { json: true, temperature: 0.2, maxTokens: 512, timeoutMs: 45_000 },
  });

  const data = parseJsonContent(content);
  const primary = normalizePatternName(data.primary);

  if (!primary) {
    throw new TeachApiError("AI suggested an unrecognized pattern. Pick one manually.", {
      status: 502,
      code: "INVALID_PATTERN",
    });
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

  if (code.length > 12_000) {
    throw new TeachApiError("Solution is too long to analyze (max 12,000 characters).", {
      status: 400,
      code: "INVALID_INPUT",
    });
  }

  const userPrompt = [
    title && `Problem: ${title.trim()}`,
    "",
    "Analyze this solution:",
    "```",
    code.trim(),
    "```",
  ].filter((line) => line !== false).join("\n");

  const { content, model, usage } = await generateContent({
    systemPrompt: COMPLEXITY_SYSTEM,
    userPrompt,
    options: { json: true, temperature: 0.1, maxTokens: 512, timeoutMs: 45_000 },
  });

  const data = parseJsonContent(content);
  const timeComplexity = data.timeComplexity?.trim();
  const spaceComplexity = data.spaceComplexity?.trim();

  if (!timeComplexity || !spaceComplexity) {
    throw new TeachApiError("AI could not determine complexity. Try again.", {
      status: 502,
      code: "INVALID_COMPLEXITY",
    });
  }

  return {
    timeComplexity,
    spaceComplexity,
    explanation: typeof data.explanation === "string" ? data.explanation.trim() : "",
    model,
    usage,
  };
}