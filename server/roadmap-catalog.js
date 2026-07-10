/**
 * Server-side roadmap catalog (shared with client data/roadmap.js)
 */

import {
  getTopicById,
  getOrderedRoadmapTopics,
  topicTrackFromId,
} from "../js/data/roadmap.js";

export { getTopicById, getOrderedRoadmapTopics, topicTrackFromId };

export function buildTopicDeepLink(topicId) {
  return `/#/roadmap?open=${encodeURIComponent(topicId)}`;
}

export function enrichTopic(topic) {
  if (!topic) return null;
  return {
    topicId: topic.id,
    topicName: topic.name,
    phase: topic.phase,
    step: topic.step ?? null,
    difficulty: topic.difficulty,
    track: topicTrackFromId(topic.id),
    deepLink: buildTopicDeepLink(topic.id),
  };
}