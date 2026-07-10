/**
 * Generate Daily Wisdom hooks via Gemini (shared Mantra Feed)
 * Multi-topic batching: ~18 topics per Gemini call (~6 calls for full roadmap)
 */

import crypto from "crypto";
import { generateWithModelFallback, resolveApiKey, TeachApiError } from "./gemini.js";
import { generateWithGroq, isGroqConfigured, resolveGroqApiKey } from "./groq.js";
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

export const FACTS_PER_TOPIC = 5;
export const MIN_FACTS_PER_TOPIC = 5;
export const TOPICS_PER_GEMINI_CALL = 18;
const HOOK_MAX_LEN = 90;
const MULTI_BATCH_TIMEOUT_MS = 180_000;
const SINGLE_TOPIC_TIMEOUT_MS = 90_000;

const VALUE_HOOK_STYLES = ["insight", "mistake", "interview_tip"];

const FACT_SYSTEM_PROMPT = `You write Daily Wisdom hooks for DSAMantra, a FAANG DSA learning app.
Each hook must deliver real value — not filler. Style: catchy like Zomato/Swiggy alerts (playful, surprising) but every line teaches something specific.
Output valid JSON only. No markdown fences.`;

function generateFactId(topicId, index) {
  return `fact_${topicId}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}_${index}`;
}

function truncateHook(text, max = HOOK_MAX_LEN) {
  const str = String(text || "").replace(/\s+/g, " ").trim();
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trim()}…`;
}

function normalizeTopicKey(id) {
  return String(id || "").trim().toLowerCase();
}

function extractJsonPayload(content) {
  const raw = String(content || "").trim();
  if (!raw) throw new TeachApiError("Empty Gemini response.", { status: 502, code: "EMPTY_RESPONSE" });

  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new TeachApiError("Could not parse Gemini facts JSON.", { status: 502, code: "PARSE_ERROR" });
  }
}

function normalizeHookStyle(raw) {
  const allowedStyles = new Set([...VALUE_HOOK_STYLES, "curiosity", "interview", "analogy", "history"]);
  const legacyStyleMap = {
    curiosity: "insight",
    interview: "interview_tip",
    analogy: "insight",
    history: "insight",
  };
  let hookStyle = raw || "insight";
  if (!allowedStyles.has(hookStyle)) hookStyle = "insight";
  if (legacyStyleMap[hookStyle]) hookStyle = legacyStyleMap[hookStyle];
  return hookStyle;
}

function factsFromRawList(rawFacts, topic) {
  if (!Array.isArray(rawFacts)) return [];

  return rawFacts
    .map((item, index) => {
      const hook = truncateHook(item?.hook || item?.body || item?.text);
      if (!hook) return null;
      return {
        id: generateFactId(topic.id, index),
        topicId: topic.id,
        phase: topic.phase,
        topicName: topic.name,
        hookStyle: normalizeHookStyle(item?.hookStyle),
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

function buildSingleTopicPrompt(topic) {
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

function buildMultiTopicPrompt(topics) {
  const lines = topics.map((topic, i) => {
    const track = topicTrackFromId(topic.id);
    const trackLabel = track ? track.toUpperCase() : "General";
    return `${i + 1}. topicId: "${topic.id}" | name: "${topic.name}" | Phase ${topic.phase} | ${topic.difficulty} | ${trackLabel}`;
  }).join("\n");

  return `Generate Daily Wisdom hooks for ALL ${topics.length} topics below in ONE JSON response.

Topics:
${lines}

For EACH topic write exactly ${FACTS_PER_TOPIC} hooks.
Rules per hook:
- No person names (personalized later).
- Max ${HOOK_MAX_LEN} characters.
- Concrete, topic-specific value (insight, mistake, or interview tip).
- Punchy Zomato/Swiggy style; 0-1 emoji ok.

Return JSON exactly:
{
  "topics": [
    {
      "topicId": "<id from list>",
      "facts": [
        { "hookStyle": "insight", "hook": "..." },
        { "hookStyle": "mistake", "hook": "..." },
        { "hookStyle": "interview_tip", "hook": "..." }
      ]
    }
  ]
}

Include every topicId from the list. hookStyle: insight | mistake | interview_tip`;
}

function parseMultiTopicFacts(payload, topics) {
  const topicMap = new Map(topics.map((t) => [normalizeTopicKey(t.id), t]));
  const rawTopics = payload?.topics || payload?.topicFacts || payload?.results;

  if (!Array.isArray(rawTopics)) {
    throw new TeachApiError("Gemini batch JSON missing topics array.", { status: 502, code: "INVALID_AI_RESPONSE" });
  }

  const parsed = new Map();

  for (const entry of rawTopics) {
    const key = normalizeTopicKey(entry?.topicId || entry?.id || entry?.topic_id);
    const topic = topicMap.get(key);
    if (!topic) continue;

    const facts = factsFromRawList(entry?.facts || entry?.hooks, topic);
    if (facts.length) parsed.set(topic.id, facts);
  }

  return parsed;
}

async function saveFactsForTopic(topicId, facts, { replaceExisting = false } = {}) {
  if (replaceExisting) {
    await deactivateFactsForTopic(topicId);
  }

  const saved = [];
  for (const fact of facts) {
    const doc = await upsertTopicLearningFact(fact);
    if (doc) saved.push(doc);
  }

  return saved;
}

function resolveHooksProvider(useGeminiFallback = false) {
  return useGeminiFallback ? "gemini" : "groq";
}

async function callHooksLlmForFacts({
  provider = "groq",
  userPrompt,
  maxTokens,
  timeoutMs,
  validateResponse,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === "gemini") {
      const apiKey = resolveApiKey();
      return await generateWithModelFallback({
        apiKey,
        systemPrompt: FACT_SYSTEM_PROMPT,
        userPrompt,
        options: { json: true, temperature: 0.85, maxTokens },
        signal: controller.signal,
        validateResponse,
      });
    }

    const apiKey = resolveGroqApiKey();
    return await generateWithGroq({
      apiKey,
      systemPrompt: FACT_SYSTEM_PROMPT,
      userPrompt,
      options: { json: true, temperature: 0.85, maxTokens },
      signal: controller.signal,
      validateResponse,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string} topicId
 * @param {{ replaceExisting?: boolean }} options
 */
export async function generateFactsForTopic(topicId, { replaceExisting = true, provider = "groq" } = {}) {
  const topic = getTopicById(topicId);
  if (!topic) {
    throw new TeachApiError("Unknown topic id.", { status: 404, code: "NOT_FOUND" });
  }

  const result = await callHooksLlmForFacts({
    provider,
    userPrompt: buildSingleTopicPrompt(topic),
    maxTokens: 1024,
    timeoutMs: SINGLE_TOPIC_TIMEOUT_MS,
    validateResponse: (content) => {
      const payload = extractJsonPayload(content);
      const facts = factsFromRawList(payload?.facts || payload, topic);
      if (!facts.length) {
        throw new TeachApiError("No facts generated.", { status: 502, code: "INVALID_AI_RESPONSE" });
      }
      return facts;
    },
  });

  const saved = await saveFactsForTopic(topicId, result.parsed, { replaceExisting });

  return {
    topicId,
    topicName: topic.name,
    generated: saved.length,
    model: result.model,
    mode: "single",
    provider,
    facts: saved,
  };
}

/**
 * One LLM call for multiple topics; per-topic fallback on partial failure (same provider).
 */
async function generateFactsMultiTopicCall(topics, { replaceExisting = false, provider = "groq" } = {}) {
  if (!topics.length) return { results: [], errors: [], mode: "multi", model: null, provider };

  const result = await callHooksLlmForFacts({
    provider,
    userPrompt: buildMultiTopicPrompt(topics),
    maxTokens: 8192,
    timeoutMs: MULTI_BATCH_TIMEOUT_MS,
    validateResponse: (content) => {
      const payload = extractJsonPayload(content);
      return parseMultiTopicFacts(payload, topics);
    },
  });

  const parsedMap = result.parsed;
  const results = [];
  const errors = [];

  for (const topic of topics) {
    const facts = parsedMap.get(topic.id);

    if (facts?.length) {
      try {
        const saved = await saveFactsForTopic(topic.id, facts, { replaceExisting });
        results.push({
          topicId: topic.id,
          topicName: topic.name,
          generated: saved.length,
          model: result.model,
          mode: "multi",
          facts: saved,
        });
      } catch (err) {
        errors.push({
          topicId: topic.id,
          topicName: topic.name,
          message: err?.message || String(err),
          mode: "multi_save",
        });
      }
      continue;
    }

    try {
      const single = await generateFactsForTopic(topic.id, { replaceExisting, provider });
      single.mode = "single_fallback";
      results.push(single);
    } catch (err) {
      errors.push({
        topicId: topic.id,
        topicName: topic.name,
        message: err?.message || String(err),
        mode: "single_fallback",
      });
    }
  }

  return { results, errors, mode: "multi", model: result.model, provider };
}

/**
 * Try multi-topic batch; Groq failures require admin-approved Gemini fallback.
 */
async function generateFactsWithBatchFallback(topics, { replaceExisting = false, provider = "groq" } = {}) {
  try {
    return await generateFactsMultiTopicCall(topics, { replaceExisting, provider });
  } catch (batchErr) {
    if (provider === "groq") {
      throw batchErr;
    }

    const results = [];
    const errors = [];

    for (const topic of topics) {
      try {
        const single = await generateFactsForTopic(topic.id, { replaceExisting, provider: "gemini" });
        single.mode = "single_fallback";
        results.push(single);
      } catch (err) {
        errors.push({
          topicId: topic.id,
          topicName: topic.name,
          message: err?.message || String(err),
          mode: "single_fallback",
        });
      }
    }

    return {
      results,
      errors,
      mode: "single_fallback",
      model: null,
      provider: "gemini",
      batchError: batchErr?.message || String(batchErr),
    };
  }
}

function buildGroqFailureResult({ queueTotal, perCall, groqError }) {
  const totalBatches = Math.ceil(queueTotal / perCall) || 1;
  return {
    topicsPerCall: perCall,
    provider: "groq",
    mode: "groq_failed",
    needsGeminiFallback: true,
    groqError,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    fallbackCount: 0,
    remaining: queueTotal,
    queueTotal,
    totalBatches,
    batchIndex: 0,
    completedTopics: 0,
    totalTopics: getOrderedRoadmapTopics().length,
    coveredTopics: null,
    results: [],
    errors: [],
    activity: [{
      status: "warning",
      message: `Groq failed: ${groqError}. Approve Gemini fallback to continue.`,
    }],
  };
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

async function resolveTopicsQueue({ replaceExisting = false } = {}) {
  if (replaceExisting) {
    const ordered = getOrderedRoadmapTopics();
    return Promise.all(
      ordered.map(async (topic) => ({
        topicId: topic.id,
        topicName: topic.name,
        phase: topic.phase,
        count: await countFactsForTopic(topic.id),
      })),
    );
  }
  return listTopicsNeedingFacts();
}

function buildBatchActivity({ results, errors, mode, batchError, provider = "groq" }) {
  const lines = [];
  const label = provider === "gemini" ? "Gemini" : "Groq";

  if (mode === "single_fallback" && batchError) {
    lines.push({ status: "warning", message: `${label} batch failed — retried topics individually: ${batchError}` });
  } else if (mode === "multi") {
    lines.push({ status: "success", message: `Multi-topic ${label} batch (${results.length} saved)` });
  }

  for (const r of results) {
    const tag = r.mode === "single_fallback" ? " (fallback)" : "";
    lines.push({
      status: "success",
      message: `${r.topicName}: ${r.generated} hooks${tag}`,
      topicId: r.topicId,
    });
  }

  for (const e of errors) {
    lines.push({
      status: "failed",
      message: `${e.topicName}: ${e.message}`,
      topicId: e.topicId,
    });
  }

  return lines;
}

/**
 * Process next chunk of topics in one LLM call (up to topicsPerCall). Default: Groq.
 */
export async function generateFactsBatch({
  topicsPerCall = TOPICS_PER_GEMINI_CALL,
  replaceExisting = false,
  useGeminiFallback = false,
} = {}) {
  const perCall = Math.min(Math.max(Number.parseInt(topicsPerCall, 10) || TOPICS_PER_GEMINI_CALL, 1), 20);
  const provider = resolveHooksProvider(useGeminiFallback);
  const pending = await resolveTopicsQueue({ replaceExisting });
  const queueTotal = pending.length;
  const batchItems = pending.slice(0, perCall);
  const topics = batchItems
    .map((item) => getTopicById(item.topicId))
    .filter(Boolean);

  if (!topics.length) {
    return {
      topicsPerCall: perCall,
      provider,
      mode: "idle",
      needsGeminiFallback: false,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      remaining: 0,
      queueTotal: 0,
      totalBatches: 0,
      batchIndex: 0,
      totalTopics: getOrderedRoadmapTopics().length,
      coveredTopics: (await listTopicIdsWithFacts()).length,
      results: [],
      errors: [],
      activity: [],
    };
  }

  if (provider === "groq" && !isGroqConfigured()) {
    const failure = buildGroqFailureResult({
      queueTotal,
      perCall,
      groqError: "GROQ_API_KEY is not configured on the server.",
    });
    failure.coveredTopics = await listTopicIdsWithFacts().then((ids) => ids.length);
    return failure;
  }

  try {
    const { results, errors, mode, model, batchError } = await generateFactsWithBatchFallback(topics, {
      replaceExisting,
      provider,
    });

    const remaining = Math.max(0, queueTotal - batchItems.length);
    const totalBatches = Math.ceil(queueTotal / perCall) || 1;
    const batchIndex = totalBatches - Math.ceil(remaining / perCall);
    const fallbackCount = results.filter((r) => r.mode === "single_fallback").length;

    return {
      topicsPerCall: perCall,
      provider,
      mode,
      model: model || null,
      batchError: batchError || null,
      needsGeminiFallback: false,
      processed: batchItems.length,
      succeeded: results.length,
      failed: errors.length,
      skipped: Math.max(0, batchItems.length - results.length - errors.length),
      fallbackCount,
      remaining,
      queueTotal,
      totalBatches,
      batchIndex,
      completedTopics: queueTotal - remaining,
      totalTopics: getOrderedRoadmapTopics().length,
      coveredTopics: (await listTopicIdsWithFacts()).length,
      results,
      errors,
      activity: buildBatchActivity({ results, errors, mode, batchError, provider }),
    };
  } catch (err) {
    if (provider === "groq" && !useGeminiFallback) {
      const failure = buildGroqFailureResult({
        queueTotal,
        perCall,
        groqError: err?.message || "Groq request failed.",
      });
      failure.coveredTopics = await listTopicIdsWithFacts().then((ids) => ids.length);
      return failure;
    }
    throw err;
  }
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
    topicsPerGeminiCall: TOPICS_PER_GEMINI_CALL,
    hooksProviderDefault: "groq",
    groqConfigured: isGroqConfigured(),
  };
}