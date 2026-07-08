/**
 * Server-side LeetCode metadata fetcher
 * Primary: LeetCode GraphQL (official, no third-party rate limits)
 * Fallback: alfa-leetcode-api
 * Last resort: slug-derived offline metadata
 */

import { PATTERN_CATALOG } from "../js/storage/patterns-catalog.js";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const ALFA_API_BASE = "https://alfa-leetcode-api.onrender.com";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

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

const GRAPHQL_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      difficulty
      isPaidOnly
      topicTags {
        name
        slug
      }
    }
  }
`;

/** @type {Map<string, { data: object, expiresAt: number }>} */
const memoryCache = new Map();

/** @type {Map<string, Promise<object>>} */
const inflight = new Map();

export class LeetcodeApiError extends Error {
  constructor(message, { status = 502, code = "LOOKUP_FAILED" } = {}) {
    super(message);
    this.name = "LeetcodeApiError";
    this.status = status;
    this.code = code;
  }
}

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

export function slugToTitle(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildLeetcodeUrl(slug) {
  return `https://leetcode.com/problems/${slug}/`;
}

function normalizeDifficulty(difficulty) {
  const d = String(difficulty || "").trim();
  if (/^easy$/i.test(d)) return "Easy";
  if (/^medium$/i.test(d)) return "Medium";
  if (/^hard$/i.test(d)) return "Hard";
  return "Medium";
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

function normalizeTags(tags = []) {
  return tags.map((t) => ({
    name: t.name || "",
    slug: t.slug || "",
  })).filter((t) => t.name);
}

function normalizeProblemPayload(slug, data, source) {
  const tags = normalizeTags(data.topicTags || []);
  const difficulty = normalizeDifficulty(data.difficulty);

  return {
    title: data.title || data.questionTitle || slugToTitle(slug),
    leetcodeUrl: data.link || buildLeetcodeUrl(data.titleSlug || slug),
    leetcodeSlug: data.titleSlug || slug,
    leetcodeId: data.questionFrontendId || data.questionId || "",
    difficulty,
    topic: mapTopicFromTags(tags),
    pattern: matchPatternFromTags(tags),
    topicTags: tags.map((t) => t.name),
    estimatedMinutes: DIFFICULTY_TIME[difficulty] || 30,
    isPaidOnly: Boolean(data.isPaidOnly),
    source,
  };
}

function offlineFallback(slug) {
  return normalizeProblemPayload(slug, {
    title: slugToTitle(slug),
    titleSlug: slug,
    topicTags: [],
    difficulty: "Medium",
  }, "offline");
}

function getCached(slug) {
  const entry = memoryCache.get(slug);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(slug);
    return null;
  }
  return entry.data;
}

function setCached(slug, data) {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(slug, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGraphQL(slug, signal) {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Referer: "https://leetcode.com",
      Origin: "https://leetcode.com",
      "User-Agent": "DSA-Mastery-Tracker/1.0",
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: { titleSlug: slug },
    }),
    signal,
  });

  if (!res.ok) {
    throw new LeetcodeApiError(`LeetCode GraphQL failed (${res.status}).`, {
      status: res.status === 429 ? 429 : 502,
      code: res.status === 429 ? "RATE_LIMITED" : "GRAPHQL_ERROR",
    });
  }

  const json = await res.json();
  const question = json?.data?.question;

  if (!question) {
    const message = json?.errors?.[0]?.message || "Problem not found on LeetCode.";
    throw new LeetcodeApiError(message, { status: 404, code: "NOT_FOUND" });
  }

  return normalizeProblemPayload(slug, question, "leetcode-graphql");
}

async function fetchAlfaApi(slug, signal) {
  const res = await fetch(`${ALFA_API_BASE}/select?titleSlug=${encodeURIComponent(slug)}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new LeetcodeApiError(`Fallback API failed (${res.status}).`, {
      status: res.status,
      code: res.status === 429 ? "RATE_LIMITED" : "FALLBACK_ERROR",
    });
  }

  const data = await res.json();
  return normalizeProblemPayload(slug, data, "alfa-api");
}

async function fetchWithRetries(fetcher, slug, attempts = 3) {
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const result = await fetcher(slug, controller.signal);
      clearTimeout(timeout);
      return result;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;

      const isRateLimited = err instanceof LeetcodeApiError && err.code === "RATE_LIMITED";
      const isRetryable = isRateLimited || err?.name === "AbortError";

      if (isRetryable && i < attempts - 1) {
        await sleep(600 * (i + 1));
        continue;
      }

      if (!(err instanceof LeetcodeApiError)) {
        if (err?.name === "AbortError") {
          throw new LeetcodeApiError("LeetCode lookup timed out. Try again.", { code: "TIMEOUT" });
        }
        throw new LeetcodeApiError(err?.message || "Network error while fetching problem.", {
          code: "NETWORK_ERROR",
        });
      }

      throw err;
    }
  }

  throw lastError || new LeetcodeApiError("LeetCode lookup failed.", { code: "LOOKUP_FAILED" });
}

async function resolveProblem(slug) {
  const cached = getCached(slug);
  if (cached) return { ...cached, cached: true };

  try {
    const result = await fetchWithRetries(fetchGraphQL, slug, 2);
    setCached(slug, result);
    return result;
  } catch (graphqlError) {
    console.warn(`[leetcode] GraphQL failed for ${slug}:`, graphqlError.message);

    try {
      const result = await fetchWithRetries(fetchAlfaApi, slug, 2);
      setCached(slug, result);
      return result;
    } catch (alfaError) {
      console.warn(`[leetcode] Alfa fallback failed for ${slug}:`, alfaError.message);

      const offline = offlineFallback(slug);
      setCached(slug, offline);
      return {
        ...offline,
        partial: true,
        warning: "Could not reach LeetCode APIs. Applied title from URL — set difficulty/tags manually or retry.",
      };
    }
  }
}

/**
 * Fetch normalized LeetCode problem metadata by slug or URL.
 * @param {string} slugOrUrl
 */
export async function fetchLeetcodeProblem(slugOrUrl) {
  const slug = parseLeetcodeSlug(slugOrUrl);
  if (!slug) {
    throw new LeetcodeApiError(
      "Invalid LeetCode URL or slug. Example: https://leetcode.com/problems/two-sum/",
      { status: 400, code: "INVALID_INPUT" },
    );
  }

  if (inflight.has(slug)) {
    return inflight.get(slug);
  }

  const promise = resolveProblem(slug).finally(() => inflight.delete(slug));
  inflight.set(slug, promise);
  return promise;
}