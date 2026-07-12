/**
 * Resolve a display topic for analytics — explicit field, roadmap, LeetCode tags, pattern.
 */

import { getTopicById } from "../data/roadmap.js";
import { resolveProblemPattern } from "./pattern-resolver.js";

const BROAD_TOPIC_PATTERNS = [
  /^array$/i,
  /^string$/i,
  /^hash table$/i,
  /^linked list$/i,
  /^binary tree$/i,
  /^tree$/i,
  /^graph$/i,
  /^math$/i,
  /^greedy$/i,
  /^dynamic programming$/i,
  /^sorting$/i,
  /^stack$/i,
  /^queue$/i,
  /^heap/i,
  /^trie$/i,
  /^bit manipulation$/i,
  /^recursion$/i,
  /^database$/i,
  /^geometry$/i,
  /^simulation$/i,
  /^counting$/i,
  /^enumeration$/i,
];

function formatTopicLabel(value) {
  return String(value || "").trim();
}

function pickPrimaryTopicTag(tags = []) {
  const normalized = tags.map((t) => formatTopicLabel(t)).filter(Boolean);
  if (!normalized.length) return null;

  for (const pattern of BROAD_TOPIC_PATTERNS) {
    const hit = normalized.find((tag) => pattern.test(tag));
    if (hit) return hit;
  }

  return normalized[0];
}

/** Stable grouping key — folds simple plural variants (arrays → array). */
export function normalizeTopicKey(name) {
  const key = formatTopicLabel(name).toLowerCase();
  if (key.endsWith("s") && key.length > 4) return key.slice(0, -1);
  return key;
}

/**
 * Infer topic text to store on a problem when the field is empty.
 * @param {import("./db.js").Problem} problem
 * @returns {string}
 */
export function inferProblemTopic(problem) {
  if (!problem) return "";

  if (problem.roadmapTopicId) {
    const roadmap = getTopicById(problem.roadmapTopicId);
    if (roadmap?.name) return roadmap.name;
  }

  const fromTag = pickPrimaryTopicTag(problem.topicTags);
  if (fromTag) return fromTag;

  const pattern = resolveProblemPattern(problem);
  if (pattern) return pattern;

  return "";
}

/**
 * Topic label used for analytics grouping (never empty — falls back to Uncategorized).
 * @param {import("./db.js").Problem} problem
 * @returns {string}
 */
export function resolveProblemTopic(problem) {
  const explicit = formatTopicLabel(problem?.topic);
  if (explicit) return explicit;

  const inferred = inferProblemTopic(problem);
  return inferred || "Uncategorized";
}