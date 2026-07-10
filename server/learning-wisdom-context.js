/**
 * Daily Wisdom delivery context — progress, streak, tone
 */

import { findUserById } from "./users-db.js";
import { getUserRoadmapProgress } from "./lesson-store.js";
import { getUserData } from "./user-data-store.js";
import { computeStudySnapshot } from "./study-metrics.js";
import { getLearningAnchor, getLastCompletedTopic } from "./learning-anchor.js";
import { firstNameFromUserName } from "./learning-fact-personalize.js";

function resolveTone({ streak, completedCount, solvedToday }) {
  if (completedCount >= 20 || streak >= 7) return "challenging";
  if (streak === 0 && !solvedToday) return "encouraging";
  if (streak >= 2) return "motivated";
  return "balanced";
}

async function resolveUser(userId) {
  if (userId === "admin") {
    return { id: "admin", role: "admin", accessLevel: "premium", status: "approved", name: "Administrator" };
  }
  return findUserById(userId);
}

/**
 * Build rich context for personalizing Daily Wisdom messages.
 * @param {string} userId
 */
export async function getWisdomDeliveryContext(userId) {
  const [user, anchor, progress] = await Promise.all([
    resolveUser(userId),
    getLearningAnchor(userId),
    getUserRoadmapProgress(userId),
  ]);

  const completedIds = progress?.completedTopicIds || [];
  const lastCompleted = getLastCompletedTopic(completedIds);

  let streak = 0;
  let solvedToday = false;
  let completedCount = completedIds.length;

  try {
    const data = await getUserData(userId);
    const snapshot = computeStudySnapshot(data.problems || [], data.activities || []);
    streak = snapshot.streak || 0;
    solvedToday = Boolean(snapshot.solvedToday);
  } catch {
    /* optional — new users may have no data */
  }

  const tone = resolveTone({ streak, completedCount, solvedToday });

  return {
    userId,
    userName: user?.name || "Learner",
    firstName: firstNameFromUserName(user?.name),
    anchor,
    lastCompleted,
    streak,
    solvedToday,
    completedCount,
    tone,
  };
}