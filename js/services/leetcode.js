/**
 * LeetCode URL parsing & metadata fetch
 * Uses alfa-leetcode-api (proxies LeetCode GraphQL) — requires network when auto-filling
 */

import { PATTERN_CATALOG } from "../storage/patterns-catalog.js";

const API_BASE = "https://alfa-leetcode-api.onrender.com";

const TAG_PATTERN_MAP = {
  "hash-table": "Hash Map",
  "dynamic-programming": "Dynamic Programming",
  "binary-search": "Binary Search",
  "depth-first-search": "BFS / DFS",
  "breadth-first-search": "BFS / DFS",
  "tree": "BFS / DFS",
  "graph": "Graph Algorithms",
  "union-find": "Union Find",
  "trie": "Trie",
  "heap-priority-queue": "Heap / Priority Queue",
  "stack": "Stack",
  "monotonic-stack": "Monotonic Stack",
  "two-pointers": "Two Pointers",
  "sliding-window": "Sliding Window",
  "backtracking": "Backtracking",
};

const DIFFICULTY_TIME = { Easy: 20, Medium: 35, Hard: 50 };

/**
 * Extract title slug from LeetCode URL or raw slug input
 */
export function parseLeetcodeSlug(input) {
  if (!input?.trim()) return null;
  const value = input.trim();

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value) && !value.includes(".")) {
    return value.toLowerCase();
  }

  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(`https://${value}`);
    const match = url.pathname.match(/\/problems\/([a-z0-9-]+)/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function buildLeetcodeUrl(slug) {
  if (!slug) return null;
  return `https://leetcode.com/problems/${slug}/`;
}

function matchPatternFromTags(tags = []) {
  for (const tag of tags) {
    const mapped = TAG_PATTERN_MAP[tag.slug];
    if (mapped) return mapped;
  }

  for (const tag of tags) {
    const name = tag.name?.toLowerCase();
    const found = PATTERN_CATALOG.find((p) => p.name.toLowerCase() === name);
    if (found) return found.name;
  }

  return "";
}

function mapTopicFromTags(tags = []) {
  if (!tags.length) return "";
  return tags.slice(0, 2).map((t) => t.name).join(" · ");
}

function normalizeDifficulty(difficulty) {
  const d = difficulty?.trim();
  if (/^easy$/i.test(d)) return "Easy";
  if (/^medium$/i.test(d)) return "Medium";
  if (/^hard$/i.test(d)) return "Hard";
  return "Medium";
}

/**
 * Fetch problem metadata from LeetCode (via alfa-leetcode-api)
 */
export async function fetchLeetcodeProblem(slugOrUrl) {
  const slug = parseLeetcodeSlug(slugOrUrl);
  if (!slug) {
    throw new Error("Invalid LeetCode URL or slug. Example: https://leetcode.com/problems/two-sum/");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${API_BASE}/select?titleSlug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`LeetCode lookup failed (${res.status}). Check the URL and try again.`);
    }

    const data = await res.json();
    const tags = data.topicTags || [];
    const difficulty = normalizeDifficulty(data.difficulty);

    return {
      title: data.questionTitle || "",
      leetcodeUrl: data.link || buildLeetcodeUrl(slug),
      leetcodeSlug: data.titleSlug || slug,
      leetcodeId: data.questionFrontendId || data.questionId || "",
      difficulty,
      topic: mapTopicFromTags(tags),
      pattern: matchPatternFromTags(tags),
      topicTags: tags.map((t) => t.name),
      estimatedMinutes: DIFFICULTY_TIME[difficulty] || 30,
      isPaidOnly: Boolean(data.isPaidOnly),
    };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. The LeetCode API may be slow — try again.");
    }
    if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
      throw new Error("Network error. Connect to the internet to auto-fill from LeetCode.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Minimal metadata from URL only (offline fallback)
 */
export function parseLeetcodeUrlOffline(input) {
  const slug = parseLeetcodeSlug(input);
  if (!slug) return null;
  return {
    leetcodeUrl: buildLeetcodeUrl(slug),
    leetcodeSlug: slug,
    leetcodeId: "",
    topicTags: [],
  };
}

export function openLeetcode(url) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}