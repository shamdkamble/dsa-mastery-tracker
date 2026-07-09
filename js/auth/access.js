/**
 * Subscription & access control
 *
 * Standard — Phase 1 Step 1 only (2 topics), AI on those 2 topics
 * Trial    — All Phase 1 topics, AI features locked
 * Premium  — Full access
 */

import { getSessionUser } from "./session.js";

/** Free tier: Phase 1, Step 1 only (Week 1 intro topics). */
export const FREE_ACCESS = { phase: 1, step: 1 };

/** Standard free preview: first 2 Phase 1 topics. */
export const STANDARD_FREE_TOPIC_IDS = new Set(["cpp-toolchain", "dsa-complexity"]);

/** @deprecated Use STANDARD_FREE_TOPIC_IDS */
export const STANDARD_AI_TOPIC_IDS = STANDARD_FREE_TOPIC_IDS;

/**
 * @param {Object | null | undefined} [user]
 * @returns {boolean}
 */
export function hasPremiumAccess(user = getSessionUser()) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.accessLevel === "premium";
}

/**
 * @param {Object | null | undefined} user
 * @returns {boolean}
 */
export function hasFullRoadmapAccess(user = getSessionUser()) {
  return hasPremiumAccess(user);
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
 * @returns {boolean}
 */
export function hasStandardAccess(user) {
  if (!user) return false;
  return user.accessLevel === "standard";
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
 * Whether the user can open the Learn modal for a topic.
 * @param {Object | null | undefined} user
 * @param {{ phase?: number, id?: string, step?: number }} topic
 * @returns {boolean}
 */
export function canOpenLesson(user, topic) {
  if (!user || !topic) return false;
  if (hasPremiumAccess(user)) return true;
  if (hasTrialAccess(user) && topic.phase === 1) return true;
  return canAccessTopic(user, topic, topic.step);
}

/**
 * Whether the user can read a cached lesson (GET /api/teach/lesson).
 * @param {Object | null | undefined} user
 * @param {{ id?: string, topicId?: string, phase?: number, step?: number }} topic
 * @returns {boolean}
 */
export function canAccessCachedLesson(user, topic) {
  return canOpenLesson(user, topic);
}

/**
 * Whether the user can generate or regenerate AI lesson content.
 * @param {Object | null | undefined} user
 * @param {{ id?: string, topicId?: string }} topic
 * @returns {boolean}
 */
export function canAccessAiGeneration(user, topic) {
  if (!user || !topic) return false;
  if (hasPremiumAccess(user)) return true;
  if (hasTrialAccess(user)) return false;
  const topicId = topic.id ?? topic.topicId;
  return hasStandardAccess(user) && STANDARD_FREE_TOPIC_IDS.has(topicId);
}

/**
 * @param {Object | null | undefined} user
 * @param {{ id?: string, topicId?: string }} topic
 * @returns {boolean}
 */
export function canAccessAiLesson(user, topic) {
  return canAccessAiGeneration(user, topic);
}

/**
 * Problem-modal AI: pattern detection & complexity analysis.
 * @param {Object | null | undefined} user
 * @returns {boolean}
 */
export function canAccessProblemAi(user = getSessionUser()) {
  return hasPremiumAccess(user);
}

/**
 * @param {Object | null | undefined} user
 * @returns {number | null}
 */
export function getTrialDaysRemaining(user = getSessionUser()) {
  if (!user?.expiresAt) return null;
  const ms = new Date(user.expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * @param {Object | null | undefined} user
 * @returns {string}
 */
export function getRoadmapAccessHint(user = getSessionUser()) {
  if (hasPremiumAccess(user)) return "Premium · Full access";
  if (hasTrialAccess(user)) {
    const days = getTrialDaysRemaining(user);
    if (days != null && days > 0) {
      return `Trial · ${days} day${days === 1 ? "" : "s"} left · AI locked`;
    }
    return "Trial · Phase 1 · AI locked";
  }
  return "Free · 2 topics in Phase 1";
}