/**
 * LeetCode URL parsing & metadata fetch
 * Fetches via server proxy (/api/leetcode/problem) with client-side cache
 */

import { API_BASE_URL } from "../config.js";

const CACHE_PREFIX = "lc-meta:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, Promise<object>>} */
const inflight = new Map();

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

export function slugToTitle(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveBaseUrl() {
  return API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function readCache(slug) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${slug}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.data || Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${slug}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(slug, data) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${slug}`, JSON.stringify({
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }));
  } catch {
    // Storage full or unavailable — ignore
  }
}

async function fetchFromServer(slug) {
  const cached = readCache(slug);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(
      `${resolveBaseUrl()}/api/leetcode/problem?slug=${encodeURIComponent(slug)}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.error?.message
        || `LeetCode lookup failed (${res.status}). Check the URL and try again.`;
      throw new Error(message);
    }

    writeCache(slug, data);
    return data;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Try again in a moment.");
    }
    if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
      throw new Error("Cannot reach the server. Run npm start (Node server), not a static-only server.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch problem metadata from LeetCode (via server proxy)
 */
export async function fetchLeetcodeProblem(slugOrUrl) {
  const slug = parseLeetcodeSlug(slugOrUrl);
  if (!slug) {
    throw new Error("Invalid LeetCode URL or slug. Example: https://leetcode.com/problems/two-sum/");
  }

  if (inflight.has(slug)) {
    return inflight.get(slug);
  }

  const promise = fetchFromServer(slug).finally(() => inflight.delete(slug));
  inflight.set(slug, promise);
  return promise;
}

/**
 * Minimal metadata from URL only (offline fallback)
 */
export function parseLeetcodeUrlOffline(input) {
  const slug = parseLeetcodeSlug(input);
  if (!slug) return null;

  return {
    title: slugToTitle(slug),
    leetcodeUrl: buildLeetcodeUrl(slug),
    leetcodeSlug: slug,
    leetcodeId: "",
    topicTags: [],
    difficulty: "Medium",
    estimatedMinutes: 35,
  };
}

export function openLeetcode(url) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}