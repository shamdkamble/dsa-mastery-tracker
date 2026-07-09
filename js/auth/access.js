/**
 * Roadmap access control
 */

import { getSessionUser } from "./session.js";

/** Free tier: Phase 1, Step 1 only (Week 1 intro topics). */
export const FREE_ACCESS = { phase: 1, step: 1 };

/** Standard: AI lessons limited to the Phase 1 Step 1 topic pair. */
export const STANDARD_AI_TOPIC_IDS = new Set(["cpp-toolchain", "dsa-complexity"]);

/**
 * @param {Object | null | undefined} [user]
 * @returns {boolean}
 */
export function hasFullRoadmapAccess(user = getSessionUser()) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.accessLevel === "premium";
}

/**
 * @param {Object | null | undefined} user
 * @returns {boolean}
 */
export function hasTrialAccess(user) {
  if (!user) return false;
  return user.accessLevel === "trial";
}

/**
 * @param {Object | null | undefined} user
 * @param {number} phase
 * @param {number} [step]
 * @returns {boolean}
 */
export function canAccessRoadmapStep(user, phase, step) {
  if (hasFullRoadmapAccess(user)) return true;
  if (hasTrialAccess(user) && phase === 1) return true;
  if (phase !== FREE_ACCESS.phase) return false;
  if (step == null) return true;
  return step === FREE_ACCESS.step;
}

/**
 * @param {Object | null | undefined} user
 * @param {number} phaseId
 * @returns {boolean}
 */
export function canAccessPhase(user, phaseId) {
  if (hasFullRoadmapAccess(user)) return true;
  return phaseId === FREE_ACCESS.phase;
}

/**
 * @param {Object | null | undefined} user
 * @param {{ phase: number, id?: string }} topic
 * @param {number} [step]
 * @returns {boolean}
 */
export function canAccessTopic(user, topic, step) {
  if (hasFullRoadmapAccess(user)) return true;
  if (hasTrialAccess(user) && topic.phase === 1) return true;
  if (topic.phase !== FREE_ACCESS.phase) return false;
  return step === FREE_ACCESS.step;
}

/**
 * @param {Object | null | undefined} user
 * @param {{ id?: string, topicId?: string }} topic
 * @returns {boolean}
 */
export function canAccessAiLesson(user, topic) {
  if (!user || !topic) return false;
  if (user.role === "admin") return true;
  if (user.accessLevel === "premium") return true;
  if (user.accessLevel === "trial") return false;
  const topicId = topic.id ?? topic.topicId;
  return user.accessLevel === "standard" && STANDARD_AI_TOPIC_IDS.has(topicId);
}

/**
 * Problem-modal AI helpers (pattern detection, complexity analysis).
 * @param {Object | null | undefined} user
 * @returns {boolean}
 */
export function canAccessProblemAi(user = getSessionUser()) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.accessLevel === "premium";
}

/**
 * @param {Object | null | undefined} user
 * @returns {string}
 */
export function getRoadmapAccessHint(user = getSessionUser()) {
  if (hasFullRoadmapAccess(user)) return "Full access";
  if (hasTrialAccess(user)) return "Trial: Phase 1 · AI locked";
  return "Free preview: Week 1 · Step 1";
}