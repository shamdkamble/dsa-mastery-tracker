/**
 * Roadmap access control
 */

import { getSessionUser } from "./session.js";

/** Free tier: Phase 1, Step 1 only (Week 1 intro topics). */
export const FREE_ACCESS = { phase: 1, step: 1 };

/**
 * @param {Object | null | undefined} [user]
 * @returns {boolean}
 */
export function hasFullRoadmapAccess(user = getSessionUser()) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.accessLevel === "premium" || user.accessLevel === "trial") return true;
  return false;
}

/**
 * @param {Object | null | undefined} user
 * @param {number} phase
 * @param {number} [step]
 * @returns {boolean}
 */
export function canAccessRoadmapStep(user, phase, step) {
  if (hasFullRoadmapAccess(user)) return true;
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
 * @param {{ phase: number }} topic
 * @param {number} [step]
 * @returns {boolean}
 */
export function canAccessTopic(user, topic, step) {
  if (hasFullRoadmapAccess(user)) return true;
  if (topic.phase !== FREE_ACCESS.phase) return false;
  return step === FREE_ACCESS.step;
}