/**
 * localStorage data layer — full CRUD
 */

import { dispatch } from "../utils.js";
import { generateId, todayKey } from "./helpers.js";

const STORAGE_KEY_LEGACY = "dsa-tracker-db";
const STORAGE_KEY_PREFIX = "dsa-tracker-db";
const DB_VERSION = 1;

let activeUserId = null;

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
      readNotificationIds: [],
    },
  };
}

let cache = null;

function resolveUserId(user) {
  if (!user) return null;
  return user.id || user.email || null;
}

function getStorageKey() {
  if (!activeUserId) return `${STORAGE_KEY_PREFIX}:guest`;
  return `${STORAGE_KEY_PREFIX}:${activeUserId}`;
}

function mergeStoredData(parsed) {
  const base = defaultDB();
  return {
    ...base,
    ...parsed,
    user: { ...base.user, ...parsed.user },
    settings: { ...base.settings, ...parsed.settings },
    meta: { ...base.meta, ...parsed.meta },
    problems: Array.isArray(parsed.problems) ? parsed.problems : [],
    notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    searchRecent: Array.isArray(parsed.searchRecent) ? parsed.searchRecent : [],
  };
}

function applyAuthProfile(db, authUser) {
  if (!authUser) return db;
  db.user = {
    ...db.user,
    name: authUser.name || db.user.name,
    email: authUser.email || db.user.email,
  };
  if (!db.user.joined) {
    db.user.joined = new Date().toISOString();
  }
  return db;
}

function readStorageRaw(key) {
  let raw = localStorage.getItem(key);

  if (!raw && activeUserId && key !== STORAGE_KEY_LEGACY) {
    const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (legacy) {
      localStorage.setItem(key, legacy);
      raw = legacy;
    }
  }

  return raw;
}

function load() {
  if (cache) return cache;

  const key = getStorageKey();

  try {
    const raw = readStorageRaw(key);
    if (raw) {
      cache = mergeStoredData(JSON.parse(raw));
      return cache;
    }
  } catch (e) {
    console.warn("Failed to load DB", e);
  }

  cache = defaultDB();
  persist({ silent: true });
  return cache;
}

function persist({ silent = false } = {}) {
  if (!cache) return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(cache));
    if (!silent) {
      dispatch("data:change", { db: cache });
    }
  } catch (e) {
    console.warn("Failed to persist DB", e);
  }
}

/**
 * Switch the in-memory store to the given authenticated user (or guest).
 * Each account gets its own localStorage key so progress is isolated per user.
 * @param {Object | null | undefined} authUser
 */
export function switchUserContext(authUser) {
  const nextId = resolveUserId(authUser);

  if (nextId === activeUserId && cache) {
    if (authUser) applyAuthProfile(cache, authUser);
    return cache;
  }

  if (cache) {
    persist({ silent: true });
  }

  activeUserId = nextId;
  cache = null;

  const db = load();
  if (authUser) {
    applyAuthProfile(db, authUser);
    persist({ silent: true });
  }

  dispatch("data:change", { db });
  return db;
}

export function getActiveUserId() {
  return activeUserId;
}

export function initDB(authUser = null) {
  if (authUser) {
    return switchUserContext(authUser);
  }
  load();
  return cache;
}

export function getDB() {
  return load();
}

function touch(options) {
  persist(options);
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

export function updateSettings(updates, options) {
  const db = load();
  db.settings = { ...db.settings, ...updates };
  touch(options);
  return db.settings;
}

export function updateNotificationSetting(key, value, options) {
  const db = load();
  db.settings.notifications[key] = value;
  touch(options);
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
  touch({ silent: true });
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
    touch({ silent: true });
  }
  return db.meta.longestStreak;
}

/* ── In-app notifications (read state) ── */

export function getReadNotificationIds() {
  return [...(load().meta.readNotificationIds || [])];
}

export function markNotificationRead(id) {
  if (!id || id === "empty-feed") return;
  const db = load();
  if (!Array.isArray(db.meta.readNotificationIds)) {
    db.meta.readNotificationIds = [];
  }
  if (!db.meta.readNotificationIds.includes(id)) {
    db.meta.readNotificationIds.push(id);
    if (db.meta.readNotificationIds.length > 200) {
      db.meta.readNotificationIds = db.meta.readNotificationIds.slice(-200);
    }
    touch({ silent: true });
    dispatch("notifications:change");
  }
}

export function markAllNotificationsRead(ids) {
  const db = load();
  if (!Array.isArray(db.meta.readNotificationIds)) {
    db.meta.readNotificationIds = [];
  }
  db.meta.readNotificationIds = [...new Set([...db.meta.readNotificationIds, ...ids])];
  touch({ silent: true });
  dispatch("notifications:change");
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