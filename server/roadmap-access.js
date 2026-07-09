/**
 * Server-side roadmap access checks (mirrors js/auth/access.js)
 */

export const FREE_ACCESS = { phase: 1, step: 1 };

export const STANDARD_AI_TOPIC_IDS = new Set(["cpp-toolchain", "dsa-complexity"]);

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
  if (user.accessLevel === "trial") return false;
  const topicId = topic.id ?? topic.topicId;
  return user.accessLevel === "standard" && STANDARD_AI_TOPIC_IDS.has(topicId);
}

export function canAccessTeachTopicById(user, topicId) {
  return canAccessTeachTopic(user, { id: topicId });
}

export function canAccessProblemAi(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.accessLevel === "premium";
}