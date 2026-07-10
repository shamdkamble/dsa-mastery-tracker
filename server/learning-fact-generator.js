/**
 * Generate catchy learning fact hooks via Gemini (shared pool, no user names)
 */

import crypto from "crypto";
import { generateWithModelFallback, resolveApiKey, TeachApiError } from "./gemini.js";
import {
  getTopicById,
  getOrderedRoadmapTopics,
  buildTopicDeepLink,
  topicTrackFromId,
} from "./roadmap-catalog.js";
import {
  countFactsForTopic,
  listTopicIdsWithFacts,
  upsertTopicLearningFact,
  deactivateFactsForTopic,
} from "./topic-learning-facts-db.js";

const FACTS_PER_TOPIC = 5;
const MIN_FACTS_PER_TOPIC = 5;
const HOOK_MAX_LEN = 90;

const VALUE_HOOK_STYLES = ["insight", "mistake", "interview_tip"];

const FACT_SYSTEM_PROMPT = `You write Daily Wisdom hooks for DSAMantra, a FAANG DSA learning app.
Each hook must deliver real value — not filler. Style: catchy like Zomato/Swiggy alerts (playful, surprising) but every line teaches something specific.
Output valid JSON only. No markdown.`;

function generateFactId(topicId, index) {
  return `fact_${topicId}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}_${index}`;
}

function truncateHook(text, max = HOOK_MAX_LEN) {
  const str = String(text || "").replace(/\s+/g, " ").trim();
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trim()}…`;
}

function buildFactPrompt(topic) {
  const track = topicTrackFromId(topic.id);
  const trackLabel = track ? track.toUpperCase() : "General";

  return `Topic: "${topic.name}" (id: ${topic.id}, Phase ${topic.phase}, ${topic.difficulty})
Track: ${trackLabel}

Write exactly ${FACTS_PER_TOPIC} ultra-short Daily Wisdom hooks for this topic.

Rules:
- Do NOT include any person's name (personalization is added later).
- Each hook max ${HOOK_MAX_LEN} characters.
- Every hook must teach something concrete about THIS topic.
- Mix hook types: ~2 insights, ~1-2 common mistakes, ~1-2 interview tips.
- Feel like a food-delivery promo: punchy, curiosity gap, light emoji ok (0-1 per hook).
- No "click here", no "welcome", no generic filler.

Return JSON:
{
  "facts": [
    { "hookStyle": "insight", "hook": "..." },
    { "hookStyle": "mistake", "hook": "..." },
    { "hookStyle": "interview_tip", "hook": "..." }
  ]
}

hookStyle must be one of: insight, mistake, interview_tip`;
}

function parseGeneratedFacts(payload, topic) {
  const raw = payload?.facts || payload;
  if (!Array.isArray(raw)) {
    throw new TeachApiError("Gemini returned invalid facts JSON.", { status: 502, code: "INVALID_AI_RESPONSE" });
  }

  const allowedStyles = new Set([...VALUE_HOOK_STYLES, "curiosity", "interview", "analogy", "history"]);
  const legacyStyleMap = {
    curiosity: "insight",
    interview: "interview_tip",
    analogy: "insight",
    history: "insight",
  };

  return raw
    .map((item, index) => {
      const hook = truncateHook(item?.hook || item?.body || item?.text);
      if (!hook) return null;
      let hookStyle = item?.hookStyle || "insight";
      if (!allowedStyles.has(hookStyle)) hookStyle = "insight";
      if (legacyStyleMap[hookStyle]) hookStyle = legacyStyleMap[hookStyle];
      return {
        id: generateFactId(topic.id, index),
        topicId: topic.id,
        phase: topic.phase,
        topicName: topic.name,
        hookStyle,
        title: truncateHook(topic.name, 48),
        body: hook,
        deepLink: buildTopicDeepLink(topic.id),
        source: "gemini",
        active: true,
      };
    })
    .filter(Boolean)
    .slice(0, FACTS_PER_TOPIC);
}

/**
 * @param {string} topicId
 * @param {{ replaceExisting?: boolean }} options
 */
export async function generateFactsForTopic(topicId, { replaceExisting = true } = {}) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new TeachApiError("Gemini API key is not configured.", { status: 503, code: "API_KEY_MISSING" });
  }

  const topic = getTopicById(topicId);
  if (!topic) {
    throw new TeachApiError("Unknown topic id.", { status: 404, code: "NOT_FOUND" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const result = await generateWithModelFallback({
      apiKey,
      systemPrompt: FACT_SYSTEM_PROMPT,
      userPrompt: buildFactPrompt(topic),
      options: { json: true, temperature: 0.85, maxTokens: 1024 },
      signal: controller.signal,
      validateResponse: (content) => {
        try {
          const parsed = JSON.parse(content);
          return parseGeneratedFacts(parsed, topic);
        } catch (err) {
          if (err instanceof TeachApiError) throw err;
          throw new TeachApiError("Could not parse Gemini facts JSON.", { status: 502, code: "PARSE_ERROR" });
        }
      },
    });

    const facts = result.parsed;
    if (!facts?.length) {
      throw new TeachApiError("No facts generated.", { status: 502, code: "INVALID_AI_RESPONSE" });
    }

    if (replaceExisting) {
      await deactivateFactsForTopic(topicId);
    }

    const saved = [];
    for (const fact of facts) {
      const doc = await upsertTopicLearningFact(fact);
      if (doc) saved.push(doc);
    }

    return {
      topicId,
      topicName: topic.name,
      generated: saved.length,
      model: result.model,
      facts: saved,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function listTopicsNeedingFacts({ minFacts = MIN_FACTS_PER_TOPIC } = {}) {
  const ordered = getOrderedRoadmapTopics();
  const withCounts = await Promise.all(
    ordered.map(async (topic) => ({
      topicId: topic.id,
      topicName: topic.name,
      phase: topic.phase,
      count: await countFactsForTopic(topic.id),
    })),
  );

  return withCounts.filter((t) => t.count < minFacts);
}

/**
 * Generate facts for the next batch of topics that need them.
 */
export async function generateFactsBatch({ limit = 6, replaceExisting = true } = {}) {
  const pending = await listTopicsNeedingFacts();
  const batch = pending.slice(0, Math.max(1, limit));

  const results = [];
  const errors = [];

  for (const item of batch) {
    try {
      const result = await generateFactsForTopic(item.topicId, { replaceExisting });
      results.push(result);
    } catch (err) {
      errors.push({
        topicId: item.topicId,
        topicName: item.topicName,
        message: err?.message || String(err),
      });
    }
  }

  const remaining = Math.max(0, pending.length - batch.length);

  return {
    processed: batch.length,
    succeeded: results.length,
    failed: errors.length,
    remaining,
    totalTopics: getOrderedRoadmapTopics().length,
    coveredTopics: (await listTopicIdsWithFacts()).length,
    results,
    errors,
  };
}

export async function getLearningFactsPoolStats() {
  const ordered = getOrderedRoadmapTopics();
  const covered = await listTopicIdsWithFacts();
  const coveredSet = new Set(covered);

  let totalFacts = 0;
  for (const topic of ordered) {
    totalFacts += await countFactsForTopic(topic.id);
  }

  return {
    totalTopics: ordered.length,
    topicsWithFacts: coveredSet.size,
    topicsMissingFacts: ordered.length - coveredSet.size,
    totalActiveFacts: totalFacts,
    factsPerTopicTarget: FACTS_PER_TOPIC,
  };
}