/**
 * Resolve a user's current learning anchor topic from roadmap progress
 */

import { findUserById } from "./users-db.js";
import { getUserRoadmapProgress } from "./lesson-store.js";
import { canAccessCachedLessonById } from "./roadmap-access.js";
import {
  getOrderedRoadmapTopics,
  getTopicById,
  enrichTopic,
} from "./roadmap-catalog.js";

function canOpenLessonForUser(user, topicId) {
  return canAccessCachedLessonById(user, topicId);
}

/**
 * Most recently completed topic in roadmap order.
 * @param {string[]} completedTopicIds
 */
export function getLastCompletedTopic(completedTopicIds = []) {
  const completed = new Set(completedTopicIds);
  const ordered = getOrderedRoadmapTopics();

  let last = null;
  for (const topic of ordered) {
    if (completed.has(topic.id)) {
      last = enrichTopic(topic);
    }
  }
  return last;
}

/**
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getLearningAnchor(userId) {
  if (!userId) return null;

  const user = userId === "admin"
    ? { id: "admin", role: "admin", accessLevel: "premium", status: "approved" }
    : await findUserById(userId);

  if (!user || user.status !== "approved") return null;

  const progress = await getUserRoadmapProgress(userId);
  const completed = new Set(progress.completedTopicIds || []);
  const ordered = getOrderedRoadmapTopics();

  for (const topic of ordered) {
    if (completed.has(topic.id)) continue;
    if (!canOpenLessonForUser(user, topic.id)) continue;
    return enrichTopic(topic);
  }

  for (const topic of ordered) {
    if (canOpenLessonForUser(user, topic.id)) {
      return enrichTopic(topic);
    }
  }

  return null;
}

/**
 * @param {string} userId
 * @param {string} topicId
 */
export async function getLearningAnchorForTopic(userId, topicId) {
  const topic = getTopicById(topicId);
  if (!topic) return null;

  const user = userId === "admin"
    ? { id: "admin", role: "admin", accessLevel: "premium", status: "approved" }
    : await findUserById(userId);

  if (!user || !canOpenLessonForUser(user, topicId)) return null;
  return enrichTopic(topic);
}