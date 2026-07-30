/**
 * EngineerOS progress store — MongoDB (same connection as DSA Mantra).
 */

import { connectDB } from "./db/mongodb.js";
import { EngineerOsProgress } from "./models/EngineerOsProgress.js";

export class EngineerOsProgressError extends Error {
  constructor(message, { status = 400, code = "ENGINEER_OS_ERROR" } = {}) {
    super(message);
    this.name = "EngineerOsProgressError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_PROGRESS = {
  started: false,
  currentWeek: 1,
  currentDay: 1,
  streak: 0,
  lastStudyDate: null,
  hoursStudiedMinutes: 0,
  leetcodeSolved: 0,
  conceptsCompleted: [],
  chaptersCompleted: [],
  quizScores: {},
  confidence: 0,
  missionProgress: 0,
  consistencyDays: 0,
  checklist: {},
  dailyMissionsCompleted: [],
  journal: [],
  mistakes: [],
  revisions: [],
  studySessions: [],
  week1Complete: false,
  name: "",
  settings: {
    dailyGoalMinutes: 120,
    soundEnabled: true,
  },
};

function toDto(doc) {
  if (!doc) {
    return { ...DEFAULT_PROGRESS, userId: null, updatedAt: null, source: "default" };
  }
  const p = doc.toObject ? doc.toObject() : doc;
  return {
    userId: p.userId,
    started: Boolean(p.started),
    currentWeek: Number(p.currentWeek) || 1,
    currentDay: Number(p.currentDay) || 1,
    streak: Number(p.streak) || 0,
    lastStudyDate: p.lastStudyDate ?? null,
    hoursStudiedMinutes: Number(p.hoursStudiedMinutes) || 0,
    leetcodeSolved: Number(p.leetcodeSolved) || 0,
    conceptsCompleted: Array.isArray(p.conceptsCompleted) ? p.conceptsCompleted : [],
    chaptersCompleted: Array.isArray(p.chaptersCompleted) ? p.chaptersCompleted : [],
    quizScores: p.quizScores && typeof p.quizScores === "object" ? p.quizScores : {},
    confidence: Number(p.confidence) || 0,
    missionProgress: Number(p.missionProgress) || 0,
    consistencyDays: Number(p.consistencyDays) || 0,
    checklist: p.checklist && typeof p.checklist === "object" ? p.checklist : {},
    dailyMissionsCompleted: Array.isArray(p.dailyMissionsCompleted)
      ? p.dailyMissionsCompleted
      : [],
    journal: Array.isArray(p.journal) ? p.journal : [],
    mistakes: Array.isArray(p.mistakes) ? p.mistakes : [],
    revisions: Array.isArray(p.revisions) ? p.revisions : [],
    studySessions: Array.isArray(p.studySessions) ? p.studySessions : [],
    week1Complete: Boolean(p.week1Complete),
    name: p.name || "",
    settings: {
      dailyGoalMinutes: p.settings?.dailyGoalMinutes ?? 120,
      soundEnabled: p.settings?.soundEnabled !== false,
    },
    updatedAt: p.updatedAt || null,
    source: "mongo",
  };
}

function sanitizePayload(body = {}) {
  const next = { ...DEFAULT_PROGRESS };

  if (typeof body.started === "boolean") next.started = body.started;
  if (Number.isFinite(body.currentWeek)) next.currentWeek = Math.max(1, Math.floor(body.currentWeek));
  if (Number.isFinite(body.currentDay)) next.currentDay = Math.max(1, Math.floor(body.currentDay));
  if (Number.isFinite(body.streak)) next.streak = Math.max(0, Math.floor(body.streak));
  if (body.lastStudyDate === null || typeof body.lastStudyDate === "string") {
    next.lastStudyDate = body.lastStudyDate;
  }
  if (Number.isFinite(body.hoursStudiedMinutes)) {
    next.hoursStudiedMinutes = Math.max(0, Math.floor(body.hoursStudiedMinutes));
  }
  if (Number.isFinite(body.leetcodeSolved)) {
    next.leetcodeSolved = Math.max(0, Math.floor(body.leetcodeSolved));
  }
  if (Array.isArray(body.conceptsCompleted)) {
    next.conceptsCompleted = body.conceptsCompleted.map(String).slice(0, 500);
  }
  if (Array.isArray(body.chaptersCompleted)) {
    next.chaptersCompleted = body.chaptersCompleted.map(String).slice(0, 200);
  }
  if (body.quizScores && typeof body.quizScores === "object") {
    next.quizScores = body.quizScores;
  }
  if (Number.isFinite(body.confidence)) {
    next.confidence = Math.max(0, Math.min(100, Math.round(body.confidence)));
  }
  if (Number.isFinite(body.missionProgress)) {
    next.missionProgress = Math.max(0, Math.min(100, Math.round(body.missionProgress)));
  }
  if (Number.isFinite(body.consistencyDays)) {
    next.consistencyDays = Math.max(0, Math.floor(body.consistencyDays));
  }
  if (body.checklist && typeof body.checklist === "object") {
    next.checklist = body.checklist;
  }
  if (Array.isArray(body.dailyMissionsCompleted)) {
    next.dailyMissionsCompleted = body.dailyMissionsCompleted
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))
      .slice(0, 100);
  }
  if (Array.isArray(body.journal)) next.journal = body.journal.slice(0, 500);
  if (Array.isArray(body.mistakes)) next.mistakes = body.mistakes.slice(0, 500);
  if (Array.isArray(body.revisions)) next.revisions = body.revisions.slice(0, 500);
  if (Array.isArray(body.studySessions)) next.studySessions = body.studySessions.slice(0, 1000);
  if (typeof body.week1Complete === "boolean") next.week1Complete = body.week1Complete;
  if (typeof body.name === "string") next.name = body.name.slice(0, 120);
  if (body.settings && typeof body.settings === "object") {
    next.settings = {
      dailyGoalMinutes: Number.isFinite(body.settings.dailyGoalMinutes)
        ? Math.max(15, Math.min(600, Math.floor(body.settings.dailyGoalMinutes)))
        : 120,
      soundEnabled: body.settings.soundEnabled !== false,
    };
  }

  return next;
}

/**
 * @param {string} userId
 */
export async function getEngineerOsProgress(userId) {
  if (!userId) {
    throw new EngineerOsProgressError("User id required.", { status: 401, code: "UNAUTHORIZED" });
  }
  await connectDB();
  const doc = await EngineerOsProgress.findOne({ userId }).lean();
  return toDto(doc ? { ...doc, userId } : null);
}

/**
 * Full replace of progress document for user (client is source of truth after load).
 * @param {string} userId
 * @param {object} body
 */
export async function upsertEngineerOsProgress(userId, body) {
  if (!userId) {
    throw new EngineerOsProgressError("User id required.", { status: 401, code: "UNAUTHORIZED" });
  }
  await connectDB();
  const data = sanitizePayload(body);
  const doc = await EngineerOsProgress.findOneAndUpdate(
    { userId },
    { $set: { ...data, userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return toDto(doc);
}

/**
 * @param {string} userId
 */
export async function resetEngineerOsProgress(userId) {
  if (!userId) {
    throw new EngineerOsProgressError("User id required.", { status: 401, code: "UNAUTHORIZED" });
  }
  await connectDB();
  await EngineerOsProgress.deleteOne({ userId });
  return toDto(null);
}
