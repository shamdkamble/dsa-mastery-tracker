/**
 * Resolve catalog patterns for problems (explicit field, roadmap topic, LeetCode tags).
 */

import { PATTERN_CATALOG } from "./patterns-catalog.js";
import { getDefaultPatternForTopic } from "../data/roadmap-problems.js";

const CATALOG_NAMES = PATTERN_CATALOG.map((p) => p.name);
const CATALOG_BY_LOWER = new Map(CATALOG_NAMES.map((name) => [name.toLowerCase(), name]));

const PATTERN_ALIASES = {
  "hash table": "Hash Map",
  hashmap: "Hash Map",
  "hash map": "Hash Map",
  "two pointer": "Two Pointers",
  "two pointers": "Two Pointers",
  "sliding window": "Sliding Window",
  "binary search": "Binary Search",
  dfs: "BFS / DFS",
  bfs: "BFS / DFS",
  "depth-first search": "BFS / DFS",
  "breadth-first search": "BFS / DFS",
  "dynamic programming": "Dynamic Programming",
  dp: "Dynamic Programming",
  "1d dp": "1D DP",
  "monotonic stack": "Monotonic Stack",
  "union find": "Union Find",
  "priority queue": "Heap / Priority Queue",
  heap: "Heap / Priority Queue",
  backtracking: "Backtracking",
  trie: "Trie",
  stack: "Stack",
  design: "Design",
  graph: "Graph Algorithms",
  "fast and slow pointers": "Fast & Slow Pointers",
  "fast & slow pointers": "Fast & Slow Pointers",
};

const TAG_RULES = [
  { pattern: /two pointers?/i, catalog: "Two Pointers" },
  { pattern: /sliding window/i, catalog: "Sliding Window" },
  { pattern: /fast.*slow|slow.*fast/i, catalog: "Fast & Slow Pointers" },
  { pattern: /binary search/i, catalog: "Binary Search" },
  { pattern: /hash( table| map)?/i, catalog: "Hash Map" },
  { pattern: /dynamic programming|^dp$/i, catalog: "Dynamic Programming" },
  { pattern: /depth-first|breadth-first|\bDFS\b|\bBFS\b/i, catalog: "BFS / DFS" },
  { pattern: /monotonic stack/i, catalog: "Monotonic Stack" },
  { pattern: /\bstack\b/i, catalog: "Stack" },
  { pattern: /heap|priority queue/i, catalog: "Heap / Priority Queue" },
  { pattern: /union find|disjoint set/i, catalog: "Union Find" },
  { pattern: /\btrie\b/i, catalog: "Trie" },
  { pattern: /backtracking/i, catalog: "Backtracking" },
  { pattern: /\bgraph\b/i, catalog: "Graph Algorithms" },
  { pattern: /design/i, catalog: "Design" },
  { pattern: /recursion|memoization/i, catalog: "1D DP" },
  { pattern: /prefix sum/i, catalog: "Hash Map" },
  { pattern: /string/i, catalog: "Two Pointers" },
];

function normalizeToCatalog(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (CATALOG_BY_LOWER.has(lower)) return CATALOG_BY_LOWER.get(lower);
  if (PATTERN_ALIASES[lower]) return PATTERN_ALIASES[lower];

  for (const name of CATALOG_NAMES) {
    const nameLower = name.toLowerCase();
    if (lower === nameLower || lower.includes(nameLower) || nameLower.includes(lower)) {
      return name;
    }
  }

  return null;
}

function matchFromTags(tags = []) {
  for (const tag of tags) {
    const text = String(tag || "").trim();
    if (!text) continue;
    for (const rule of TAG_RULES) {
      if (rule.pattern.test(text)) return rule.catalog;
    }
    const normalized = normalizeToCatalog(text);
    if (normalized) return normalized;
  }
  return null;
}

function matchFromTopicText(topic) {
  const text = String(topic || "").trim();
  if (!text) return null;
  return matchFromTags(text.split(/[·,|/]+/).map((part) => part.trim()));
}

/**
 * @param {import("./db.js").Problem} problem
 * @returns {string|null} Canonical catalog pattern name
 */
export function resolveProblemPattern(problem) {
  if (!problem) return null;

  const explicit = normalizeToCatalog(problem.pattern);
  if (explicit) return explicit;

  if (problem.roadmapTopicId) {
    const fromRoadmap = getDefaultPatternForTopic(problem.roadmapTopicId);
    const normalized = normalizeToCatalog(fromRoadmap);
    if (normalized) return normalized;
  }

  const fromTags = matchFromTags(problem.topicTags);
  if (fromTags) return fromTags;

  const fromTopic = matchFromTopicText(problem.topic);
  if (fromTopic) return fromTopic;

  return null;
}

/**
 * Infer pattern when adding problems from a completed roadmap topic.
 * @param {string} topicId
 * @param {{ topicTags?: string[], topic?: string }} meta
 */
export function inferPatternForTopic(topicId, meta = {}) {
  const fromRoadmap = normalizeToCatalog(getDefaultPatternForTopic(topicId));
  if (fromRoadmap) return fromRoadmap;

  const fromTags = matchFromTags(meta.topicTags);
  if (fromTags) return fromTags;

  const fromTopic = matchFromTopicText(meta.topic);
  if (fromTopic) return fromTopic;

  return "";
}