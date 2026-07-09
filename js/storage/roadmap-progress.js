/**
 * Roadmap completion progress — synced with MongoDB
 */

import { dispatch } from "../utils.js";
import {
  fetchRoadmapProgress,
  completeRoadmapTopic,
} from "../api/teachApi.js";
import { getToken } from "../auth/session.js";

let completedIds = new Set();
let loadPromise = null;
let progressLoaded = false;

function isRemoteMode() {
  return Boolean(getToken());
}

export function getCompletedTopicIds() {
  return [...completedIds];
}

export function isTopicCompleted(topicId) {
  return completedIds.has(topicId);
}

export function getRoadmapCompletionStats() {
  const total = completedIds.size;
  return { completedCount: total, completedIds: getCompletedTopicIds() };
}

export function countCompletedInPhase(phaseId, topics) {
  if (!Array.isArray(topics)) return 0;
  return topics.filter((t) => completedIds.has(t.id)).length;
}

export async function loadRoadmapProgress({ force = false } = {}) {
  if (!isRemoteMode()) {
    completedIds = new Set();
    progressLoaded = true;
    return getRoadmapCompletionStats();
  }

  if (progressLoaded && !force) return getRoadmapCompletionStats();

  if (loadPromise) return loadPromise;

  loadPromise = fetchRoadmapProgress()
    .then((data) => {
      completedIds = new Set(data.completedTopicIds || []);
      progressLoaded = true;
      dispatch("roadmap:progress", { completedTopicIds: getCompletedTopicIds() });
      return getRoadmapCompletionStats();
    })
    .catch((err) => {
      console.warn("[roadmap-progress] load failed", err);
      return getRoadmapCompletionStats();
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export function resetRoadmapProgress() {
  completedIds = new Set();
  loadPromise = null;
  progressLoaded = false;
}

export async function markTopicComplete(topicId) {
  if (!topicId) return getRoadmapCompletionStats();

  completedIds.add(topicId);

  if (isRemoteMode()) {
    try {
      const data = await completeRoadmapTopic(topicId);
      completedIds = new Set(data.progress?.completedTopicIds || [...completedIds]);
    } catch (err) {
      completedIds.delete(topicId);
      throw err;
    }
  }

  dispatch("roadmap:progress", { completedTopicIds: getCompletedTopicIds() });
  return getRoadmapCompletionStats();
}