/**
 * Server-side access checks (mirrors js/auth/access.js)
 */

export const FREE_ACCESS = { phase: 1, step: 1 };

export const STANDARD_FREE_TOPIC_IDS = new Set(["cpp-toolchain", "dsa-complexity"]);

/** All Phase 1 topic IDs — trial users can read cached lessons for these. */
export const PHASE1_TOPIC_IDS = new Set([
  "cpp-toolchain", "dsa-complexity", "cpp-types", "dsa-arrays",
  "cpp-control-flow", "dsa-array-basics", "cpp-loops", "dsa-two-pointers-intro",
  "cpp-functions", "dsa-two-pointers-pairs", "cpp-pointers", "dsa-strings-basics",
  "cpp-std-string", "dsa-string-patterns", "cpp-vector", "dsa-hashing-intro",
  "cpp-hash-containers", "dsa-hash-problems", "cpp-sorting", "dsa-sorting-apps",
  "cpp-stack-queue", "dsa-stack", "cpp-pair-tuple", "dsa-sliding-window-fixed",
  "cpp-auto-const", "dsa-sliding-window-variable", "cpp-structs-classes", "dsa-prefix-sum",
  "cpp-recursion", "dsa-recursion", "cpp-debugging", "dsa-framework",
]);

export function hasPremiumAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.accessLevel === "premium";
}

export function hasTrialAccess(user) {
  if (!user) return false;
  return user.accessLevel === "trial";
}

/** POST /api/teach — generate or regenerate AI lessons. */
export function canAccessTeachTopic(user, topic) {
  if (!user || !topic) return false;
  if (hasPremiumAccess(user)) return true;
  if (hasTrialAccess(user)) return false;
  const topicId = topic.id ?? topic.topicId;
  return user.accessLevel === "standard" && STANDARD_FREE_TOPIC_IDS.has(topicId);
}

/** GET /api/teach/lesson/:topicId — read cached lessons. */
export function canAccessCachedLessonById(user, topicId) {
  if (!user || !topicId) return false;
  if (hasPremiumAccess(user)) return true;
  if (hasTrialAccess(user)) return PHASE1_TOPIC_IDS.has(topicId);
  return STANDARD_FREE_TOPIC_IDS.has(topicId);
}

export function canAccessTeachTopicById(user, topicId) {
  return canAccessCachedLessonById(user, topicId);
}

export function canAccessProblemAi(user) {
  return hasPremiumAccess(user);
}