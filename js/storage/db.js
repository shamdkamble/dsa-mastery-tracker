/**
 * localStorage data layer — full CRUD
 */

import { dispatch } from "../utils.js";
import { generateId, todayKey } from "./helpers.js";

const STORAGE_KEY = "dsa-tracker-db";
const DB_VERSION = 1;

function defaultDB() {
  return {
    version: DB_VERSION,
    user: {
      name: "",
      email: "",
      goal: "",
      joined: new Date().toISOString(),
    },
    settings: {
      compactSidebar: false,
      notifications: {
        dailyReminder: true,
        streakAlert: true,
        reviewDue: true,
        weeklySummary: false,
      },
    },
    problems: [],
    notes: [],
    activities: [],
    searchRecent: [],
    meta: {
      longestStreak: 0,
      calendarMonth: { year: new Date().getFullYear(), month: new Date().getMonth() },
    },
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = { ...defaultDB(), ...JSON.parse(raw) };
      return cache;
    }
  } catch (e) {
    console.warn("Failed to load DB", e);
  }
  cache = defaultDB();
  persist();
  return cache;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    dispatch("data:change", { db: cache });
  } catch (e) {
    console.warn("Failed to persist DB", e);
  }
}

export function initDB() {
  load();
  return cache;
}

export function getDB() {
  return load();
}

function touch() {
  persist();
}

/* ── User & Settings ── */

export function getUser() {
  return { ...load().user };
}

export function updateUser(updates) {
  const db = load();
  db.user = { ...db.user, ...updates };
  touch();
  return db.user;
}

export function getSettings() {
  return { ...load().settings };
}

export function updateSettings(updates) {
  const db = load();
  db.settings = { ...db.settings, ...updates };
  touch();
  return db.settings;
}

export function updateNotificationSetting(key, value) {
  const db = load();
  db.settings.notifications[key] = value;
  touch();
}

/* ── Activities ── */

export function logActivity({ action, problemId = null, problemTitle = "", topic = "" }) {
  const db = load();
  db.activities.unshift({
    id: generateId(),
    action,
    problemId,
    problemTitle,
    topic,
    timestamp: new Date().toISOString(),
  });
  if (db.activities.length > 200) db.activities = db.activities.slice(0, 200);
  touch();
}

export function getActivities() {
  return [...load().activities];
}

/* ── Problems CRUD ── */

export function getProblems() {
  return [...load().problems];
}

export function getProblem(id) {
  return load().problems.find((p) => p.id === id) || null;
}

export function createProblem(data) {
  const db = load();
  const now = new Date().toISOString();
  const today = todayKey();

  const problem = {
    id: generateId(),
    title: data.title?.trim() || "Untitled",
    topic: data.topic?.trim() || "",
    pattern: data.pattern?.trim() || "",
    difficulty: data.difficulty || "Medium",
    status: data.status || "todo",
    attempts: Number(data.attempts) || 0,
    estimatedMinutes: Number(data.estimatedMinutes) || 30,
    leetcodeUrl: data.leetcodeUrl?.trim() || null,
    leetcodeSlug: data.leetcodeSlug?.trim() || null,
    leetcodeId: data.leetcodeId?.trim() || null,
    topicTags: Array.isArray(data.topicTags) ? data.topicTags : [],
    missionType: data.missionType || null,
    inMission: Boolean(data.inMission),
    missionDone: false,
    missionDate: data.inMission ? today : null,
    nextReviewAt: data.nextReviewAt || null,
    lastReviewAt: null,
    solvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.problems.unshift(problem);
  logActivity({ action: "Added", problemId: problem.id, problemTitle: problem.title, topic: problem.topic });
  touch();
  return problem;
}

export function updateProblem(id, updates, { silent = false } = {}) {
  const db = load();
  const idx = db.problems.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const prev = db.problems[idx];
  const updated = {
    ...prev,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.inMission === true) {
    updated.missionDate = todayKey();
  }
  if (updates.inMission === false) {
    updated.missionDate = null;
    updated.missionDone = false;
    updated.missionType = null;
  }

  if (updates.status === "mastered" && prev.status !== "mastered") {
    updated.solvedAt = new Date().toISOString();
    updated.nextReviewAt = new Date(Date.now() + 3 * 86400000).toISOString();
  }

  db.problems[idx] = updated;
  if (!silent) {
    logActivity({ action: "Updated", problemId: id, problemTitle: updated.title, topic: updated.topic });
  }
  touch();
  return updated;
}

export function deleteProblem(id) {
  const db = load();
  const problem = db.problems.find((p) => p.id === id);
  if (!problem) return false;

  db.problems = db.problems.filter((p) => p.id !== id);
  db.notes = db.notes.filter((n) => n.problemId !== id);
  logActivity({ action: "Deleted", problemTitle: problem.title, topic: problem.topic });
  touch();
  return true;
}

/* ── Mission operations ── */

export function getTodaysMissionProblems() {
  const today = todayKey();
  return load().problems.filter((p) => p.inMission && p.missionDate === today);
}

export function addToMission(id, missionType = "new") {
  const today = todayKey();
  return updateProblem(id, {
    inMission: true,
    missionDate: today,
    missionType,
    missionDone: false,
  });
}

export function removeFromMission(id) {
  return updateProblem(id, {
    inMission: false,
    missionDate: null,
    missionDone: false,
    missionType: null,
  });
}

export function toggleMissionDone(id) {
  const problem = getProblem(id);
  if (!problem) return null;

  const missionDone = !problem.missionDone;
  const updates = { missionDone };

  if (missionDone) {
    updates.lastReviewAt = new Date().toISOString();
    updates.attempts = (problem.attempts || 0) + 1;
    if (problem.status === "todo") updates.status = "learning";
    logActivity({
      action: problem.missionType === "revision" ? "Reviewed" : "Solved",
      problemId: id,
      problemTitle: problem.title,
      topic: problem.topic,
    });
  }

  return updateProblem(id, updates, { silent: true });
}

export function markProblemSolved(id) {
  const problem = getProblem(id);
  if (!problem) return null;

  logActivity({ action: "Solved", problemId: id, problemTitle: problem.title, topic: problem.topic });
  return updateProblem(id, {
    status: "mastered",
    missionDone: true,
    lastReviewAt: new Date().toISOString(),
    attempts: (problem.attempts || 0) + 1,
    nextReviewAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  }, { silent: true });
}

export function recordFailedAttempt(id) {
  const problem = getProblem(id);
  if (!problem) return null;

  logActivity({ action: "Failed attempt", problemId: id, problemTitle: problem.title, topic: problem.topic });
  return updateProblem(id, {
    status: "struggling",
    attempts: (problem.attempts || 0) + 1,
  }, { silent: true });
}

/* ── Notes CRUD ── */

export function getNotes() {
  return [...load().notes];
}

export function createNote({ title, content = "", problemId = null, problemTitle = "" }) {
  const db = load();
  const note = {
    id: generateId(),
    title: title?.trim() || "Untitled note",
    content: content?.trim() || "",
    problemId,
    problemTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.notes.unshift(note);
  logActivity({ action: "Added note", problemId, problemTitle: problemTitle || title });
  touch();
  return note;
}

export function updateNote(id, updates) {
  const db = load();
  const idx = db.notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  db.notes[idx] = { ...db.notes[idx], ...updates, updatedAt: new Date().toISOString() };
  touch();
  return db.notes[idx];
}

export function deleteNote(id) {
  const db = load();
  db.notes = db.notes.filter((n) => n.id !== id);
  touch();
  return true;
}

/* ── Search ── */

export function addSearchRecent(query) {
  const q = query?.trim().toLowerCase();
  if (!q) return;
  const db = load();
  db.searchRecent = [q, ...db.searchRecent.filter((r) => r !== q)].slice(0, 8);
  touch();
}

export function getSearchRecent() {
  return [...load().searchRecent];
}

/* ── Calendar meta ── */

export function getCalendarMonth() {
  return { ...load().meta.calendarMonth };
}

export function setCalendarMonth(year, month) {
  const db = load();
  db.meta.calendarMonth = { year, month };
  touch();
}

export function updateLongestStreak(streak) {
  const db = load();
  if (streak > db.meta.longestStreak) {
    db.meta.longestStreak = streak;
    touch();
  }
  return db.meta.longestStreak;
}

/* ── Import / Export / Clear ── */

export function exportData() {
  return JSON.stringify(load(), null, 2);
}

export function importData(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid data format");
  cache = { ...defaultDB(), ...parsed, version: DB_VERSION };
  touch();
  return cache;
}

export function clearAllData() {
  cache = defaultDB();
  touch();
  return cache;
}