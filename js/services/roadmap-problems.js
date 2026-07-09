/**
 * Roadmap → Problems sync: fetch LeetCode metadata and add to user list.
 */

import { getRecommendedSlugsForTopic } from "../data/roadmap-problems.js";
import { slugToTitle, fetchLeetcodeProblem, parseLeetcodeUrlOffline } from "./leetcode.js";
import { getProblems, createProblem } from "../storage/db.js";

/**
 * Slugs from this topic not yet in the user's problem list.
 * @param {string} topicId
 * @returns {string[]}
 */
export function getPendingRecommendations(topicId) {
  const slugs = getRecommendedSlugsForTopic(topicId);
  if (!slugs.length) return [];

  const existing = new Set(
    getProblems()
      .map((p) => p.leetcodeSlug?.toLowerCase())
      .filter(Boolean),
  );

  return slugs.filter((slug) => !existing.has(slug.toLowerCase()));
}

/**
 * @param {{ topicId: string, topicName: string, slugs: string[] }} params
 * @returns {Promise<import("../storage/db.js").Problem[]>}
 */
export async function addRoadmapProblems({ topicId, topicName, slugs }) {
  const created = [];
  const existing = new Set(
    getProblems()
      .map((p) => p.leetcodeSlug?.toLowerCase())
      .filter(Boolean),
  );

  for (const slug of slugs) {
    const key = slug.toLowerCase();
    if (existing.has(key)) continue;

    let meta;
    try {
      meta = await fetchLeetcodeProblem(slug);
    } catch {
      meta = parseLeetcodeUrlOffline(slug);
    }

    const tags = Array.isArray(meta.topicTags)
      ? meta.topicTags.map((t) => (typeof t === "string" ? t : t.name)).filter(Boolean)
      : [];

    const problem = await createProblem({
      title: meta.title || slugToTitle(slug),
      topic: topicName || meta.topic || "",
      pattern: meta.pattern || "",
      difficulty: meta.difficulty || "Medium",
      estimatedMinutes: meta.estimatedMinutes || 30,
      leetcodeUrl: meta.leetcodeUrl || meta.link,
      leetcodeSlug: meta.leetcodeSlug || meta.titleSlug || slug,
      leetcodeId: String(meta.leetcodeId || meta.questionFrontendId || meta.questionId || ""),
      topicTags: tags,
      status: "todo",
      source: "roadmap",
      roadmapTopicId: topicId,
    });

    created.push(problem);
    existing.add(key);
  }

  return created;
}