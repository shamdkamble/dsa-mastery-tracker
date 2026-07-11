/**
 * Roadmap topic practice recommendations — add remaining problems without duplicates.
 */

import { getRecommendedSlugsForTopic } from "../data/roadmap-problems.js";
import { getPendingRecommendations } from "./roadmap-problems.js";
import { openRecommendProblemsModal } from "../components/recommend-problems-modal.js";

/**
 * @param {string} topicId
 * @returns {{
 *   total: number,
 *   added: number,
 *   pending: number,
 *   pendingSlugs: string[],
 *   hasRecommendations: boolean,
 * }}
 */
export function getTopicRecommendationSummary(topicId) {
  const all = getRecommendedSlugsForTopic(topicId);
  const pendingSlugs = getPendingRecommendations(topicId);
  return {
    total: all.length,
    added: all.length - pendingSlugs.length,
    pending: pendingSlugs.length,
    pendingSlugs,
    hasRecommendations: all.length > 0,
  };
}

/**
 * Open modal for problems not yet in the user's list (skips duplicates by slug).
 * @param {{ topicId: string, topicName: string }} params
 */
export async function openTopicRecommendations({ topicId, topicName }) {
  const summary = getTopicRecommendationSummary(topicId);
  if (!summary.pending) {
    return { added: false, count: 0, alreadyComplete: true };
  }

  return openRecommendProblemsModal({
    topicId,
    topicName,
    slugs: summary.pendingSlugs,
    addedCount: summary.added,
    totalCount: summary.total,
  });
}