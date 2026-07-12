/**
 * Spaced repetition — gaps after each completed solve/review session.
 * Day 0 solve → due day 3 → day 6 → day 12 → day 24 … (gaps: 3, 3, 6, 12, 21, 30)
 */

import { todayKey, yesterdayKey } from "./helpers.js";

function isProblemMarkedDone(problem) {
  return problem?.status === "mastered"
    || Boolean(problem?.missionDone)
    || Boolean(problem?.solvedAt);
}

/** Days until next review after completing session at index `completedRevisionCount`. */
export const REVIEW_GAPS_DAYS = [3, 3, 6, 12, 21, 30];

export function computeNextReviewAt(fromDate, completedRevisionCount = 0) {
  const gap = REVIEW_GAPS_DAYS[
    Math.min(Math.max(0, completedRevisionCount), REVIEW_GAPS_DAYS.length - 1)
  ];
  const d = new Date(fromDate);
  d.setDate(d.getDate() + gap);
  return d.toISOString();
}

export function getReviewGapDays(completedRevisionCount = 0) {
  return REVIEW_GAPS_DAYS[
    Math.min(Math.max(0, completedRevisionCount), REVIEW_GAPS_DAYS.length - 1)
  ];
}

export function getRevisionRoundLabel(reviewStage = 0) {
  return `Review #${(reviewStage ?? 0) + 1}`;
}

/** Problem has been solved at least once and belongs in the revision loop. */
export function isRevisionEligible(problem) {
  if (!problem) return false;
  return Boolean(
    problem.solvedAt
    || problem.status === "mastered"
    || (problem.reviewStage ?? 0) > 0
    || (isProblemMarkedDone(problem) && problem.lastReviewAt),
  );
}

export function isRevisionDue(problem, today = todayKey()) {
  if (!isRevisionEligible(problem)) return false;
  if (!problem.nextReviewAt) return false;
  return problem.nextReviewAt.slice(0, 10) <= today;
}

export function isOnActiveRevisionMission(problem, today = todayKey(), yesterday = yesterdayKey()) {
  if (!problem?.inMission || problem.missionType !== "revision") return false;
  if (problem.missionDate === today && !problem.missionDone) return true;
  if (problem.missionDate === yesterday && !problem.missionDone) return true;
  return false;
}

/** Backfill schedule for legacy solved problems missing nextReviewAt. */
export function backfillRevisionFields(problem) {
  if (!isRevisionEligible(problem)) return null;
  if (problem.nextReviewAt) return null;

  const anchor = problem.solvedAt || problem.lastReviewAt;
  if (!anchor) return null;

  const stage = problem.reviewStage ?? 0;
  return {
    reviewStage: stage,
    nextReviewAt: computeNextReviewAt(anchor, stage),
    solvedAt: problem.solvedAt || anchor,
  };
}

export function buildInitialSolveSchedule(problem, completedAt = new Date().toISOString()) {
  const stage = problem.reviewStage ?? 0;
  const patch = {
    solvedAt: problem.solvedAt || completedAt,
    reviewStage: stage,
    lastReviewAt: completedAt,
  };
  if (!problem.nextReviewAt) {
    patch.nextReviewAt = computeNextReviewAt(completedAt, stage);
  }
  return patch;
}

export function buildRevisionCompleteSchedule(problem, completedAt = new Date().toISOString()) {
  const newStage = (problem.reviewStage ?? 0) + 1;
  return {
    reviewStage: newStage,
    nextReviewAt: computeNextReviewAt(completedAt, newStage),
    lastReviewAt: completedAt,
    inMission: false,
    missionDate: null,
    missionType: null,
    missionDone: false,
  };
}

export function buildMissionEnqueuePatch(today = todayKey()) {
  return {
    inMission: true,
    missionDate: today,
    missionType: "revision",
    missionDone: false,
  };
}

export function shouldEnqueueRevision(problem, today = todayKey(), yesterday = yesterdayKey()) {
  if (!isRevisionDue(problem, today)) return false;
  if (isOnActiveRevisionMission(problem, today, yesterday)) return false;

  if (problem.inMission && problem.missionDate === today && problem.missionType === "new" && !problem.missionDone) {
    return false;
  }

  return true;
}