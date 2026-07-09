/**
 * Server-side roadmap access checks (mirrors js/auth/access.js)
 */

export const FREE_ACCESS = { phase: 1, step: 1 };

export const TRIAL_AI_TOPIC_IDS = new Set(["cpp-toolchain", "dsa-complexity"]);

export function hasFullRoadmapAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.accessLevel === "premium";
}

export function hasTrialAccess(user) {
  if (!user) return false;
  return user.accessLevel === "trial";
}

export function canAccessTeachTopic(user, topic) {
  if (!user || !topic) return false;
  if (user.role === "admin") return true;
  if (user.accessLevel === "premium") return true;
  const topicId = topic.id ?? topic.topicId;
  return TRIAL_AI_TOPIC_IDS.has(topicId);
}