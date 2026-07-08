/**
 * Server-side roadmap access checks (mirrors js/auth/access.js)
 */

export const FREE_ACCESS = { phase: 1, step: 1 };

export function hasFullRoadmapAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.accessLevel === "premium" || user.accessLevel === "trial") return true;
  return false;
}

export function canAccessTeachTopic(user, topic) {
  if (hasFullRoadmapAccess(user)) return true;

  const phase = Number(topic?.phase);
  const step = topic?.step != null ? Number(topic.step) : null;

  if (phase !== FREE_ACCESS.phase) return false;
  if (step == null) return false;
  return step === FREE_ACCESS.step;
}