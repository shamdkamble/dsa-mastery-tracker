/**
 * User data layer — problems & activities in MongoDB when logged in;
 * settings, notes, and meta remain in localStorage per device.
 */

import { dispatch } from "../utils.js";
import { generateId, todayKey, yesterdayKey } from "./helpers.js";
import { inferProblemTopic } from "./topic-resolver.js";
import {
  backfillRevisionFields,
  buildInitialSolveSchedule,
  buildRevisionCompleteSchedule,
  buildMissionEnqueuePatch,
  shouldEnqueueRevision,
} from "./revision-schedule.js";
import { getToken } from "../auth/session.js";
import {
  fetchUserData,
  migrateUserData as apiMigrateUserData,
  apiCreateProblem,
  apiUpdateProblem,
  apiDeleteProblem,
  apiCreateActivity,
  apiClearUserData,
  apiAcknowledgeLocalRestore,
} from "../api/userDataApi.js";

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
      bio: "",
      goal: "",
      profilePhoto: "",
      joined: new Date().toISOString(),
    },
    settings: {
      compactSidebar: false,
      notifications: {
        pushEnabled: false,
        dailyReminder: true,
        streakAlert: true,
        reviewDue: true,
        weeklySummary: false,
        dailyWisdom: true,
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
      learningMission: { topicId: null, assignedDate: null },
      tour: {
        completed: false,
        dismissed: false,
      },
    },
  };
}

let cache = null;
let useRemoteStore = false;
let remoteSyncReady = false;

function isRemoteMode() {
  return useRemoteStore && Boolean(activeUserId) && Boolean(getToken());
}

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
    settings: {
      ...base.settings,
      ...parsed.settings,
      notifications: {
        ...base.settings.notifications,
        ...parsed.settings?.notifications,
      },
    },
    meta: {
      ...base.meta,
      ...parsed.meta,
      learningMission: {
        ...base.meta.learningMission,
        ...parsed.meta?.learningMission,
      },
    },
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
    const payload = useRemoteStore
      ? { ...cache, problems: [], activities: [] }
      : cache;
    localStorage.setItem(getStorageKey(), JSON.stringify(payload));
    if (!silent) {
      dispatch("data:change", { db: cache });
    }
  } catch (e) {
    console.warn("Failed to persist DB", e);
  }
}

function readLocalSnapshot(userId) {
  const key = userId ? `${STORAGE_KEY_PREFIX}:${userId}` : `${STORAGE_KEY_PREFIX}:guest`;
  try {
    const raw = readStorageRaw(key);
    if (raw) return mergeStoredData(JSON.parse(raw));
  } catch (e) {
    console.warn("Failed to read local snapshot", e);
  }
  return null;
}

function applyLocalRestore(localRestore, archiveId) {
  if (!localRestore || typeof localRestore !== "object") return;

  if (Array.isArray(localRestore.notes)) {
    cache.notes = localRestore.notes;
  }
  if (Array.isArray(localRestore.searchRecent)) {
    cache.searchRecent = localRestore.searchRecent;
  }
  if (localRestore.meta && typeof localRestore.meta === "object") {
    cache.meta = { ...cache.meta, ...localRestore.meta };
  }

  persist({ silent: true });

  if (archiveId) {
    apiAcknowledgeLocalRestore(archiveId).catch((err) => {
      console.warn("[db] Failed to acknowledge local restore", err);
    });
  }
}

async function loadRemoteUserData(userId) {
  const remote = await fetchUserData();
  cache.problems = Array.isArray(remote.problems) ? remote.problems : [];
  cache.activities = Array.isArray(remote.activities) ? remote.activities : [];

  if (remote.localRestore) {
    applyLocalRestore(remote.localRestore, remote.localRestoreArchiveId);
  }

  const local = readLocalSnapshot(userId);
  if (!cache.problems.length && local?.problems?.length) {
    try {
      const migrated = await apiMigrateUserData({
        problems: local.problems,
        activities: local.activities || [],
      });
      cache.problems = migrated.problems || [];
      cache.activities = migrated.activities || [];

      local.problems = [];
      local.activities = [];
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${userId}`, JSON.stringify(local));
      console.info(`[db] Migrated ${migrated.migratedProblems ?? cache.problems.length} problems to cloud storage.`);
    } catch (err) {
      if (err?.code === "ALREADY_MIGRATED") return;
      console.warn("[db] Cloud migration failed, using local problems temporarily.", err);
      cache.problems = local.problems;
      cache.activities = local.activities || [];
    }
  }
}

async function syncActivityRemote(activity) {
  if (!isRemoteMode()) return;
  try {
    await apiCreateActivity(activity);
  } catch (err) {
    console.warn("[db] Failed to sync activity", err);
  }
}

/**
 * Switch the in-memory store to the given authenticated user (or guest).
 * Logged-in users load problems & activities from MongoDB.
 * @param {Object | null | undefined} authUser
 */
export async function switchUserContext(authUser) {
  const nextId = resolveUserId(authUser);

  if (nextId === activeUserId && cache && remoteSyncReady) {
    if (authUser) applyAuthProfile(cache, authUser);
    return cache;
  }

  if (cache) {
    persist({ silent: true });
  }

  activeUserId = nextId;
  cache = null;
  remoteSyncReady = false;
  useRemoteStore = Boolean(nextId && getToken());

  const local = readLocalSnapshot(nextId);
  cache = local ? { ...local, problems: [], activities: [] } : defaultDB();

  if (authUser) {
    applyAuthProfile(cache, authUser);
  }

  if (useRemoteStore) {
    try {
      await loadRemoteUserData(nextId);
    } catch (err) {
      console.warn("[db] Failed to load cloud data, falling back to local cache.", err);
      if (local) {
        cache.problems = local.problems || [];
        cache.activities = local.activities || [];
      }
    }
  } else if (local) {
    cache.problems = local.problems || [];
    cache.activities = local.activities || [];
  }

  remoteSyncReady = true;
  persist({ silent: true });
  syncDueRevisionsToMission({ silent: true });
  dispatch("data:change", { db: cache });
  return cache;
}

export function getActiveUserId() {
  return activeUserId;
}

export async function initDB(authUser = null) {
  if (authUser) {
    return switchUserContext(authUser);
  }
  load();
  remoteSyncReady = true;
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
  const activity = {
    id: generateId(),
    action,
    problemId,
    problemTitle,
    topic,
    timestamp: new Date().toISOString(),
  };
  db.activities.unshift(activity);
  if (db.activities.length > 200) db.activities = db.activities.slice(0, 200);
  return activity;
}

export function getActivities() {
  return [...load().activities];
}

/* ── Problems CRUD ── */

export function getProblems() {
  return [...load().problems];
}

export function findProblemByLeetcodeSlug(slug, { excludeId = null } = {}) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;
  return load().problems.find((p) => {
    if (excludeId && p.id === excludeId) return false;
    return String(p.leetcodeSlug || "").trim().toLowerCase() === normalized;
  }) || null;
}

export function isProblemOnTodaysMission(problem) {
  if (!problem?.inMission) return false;
  const today = todayKey();
  const yesterday = yesterdayKey();
  if (problem.missionDate === today) return true;
  if (problem.missionDate === yesterday && !problem.missionDone) return true;
  return false;
}

export function sortProblemsForDisplay(problems) {
  const yesterday = yesterdayKey();

  const priority = (p) => {
    if (isProblemOnTodaysMission(p) && !p.missionDone && p.missionDate === yesterday) return 0;
    if (isProblemOnTodaysMission(p) && !p.missionDone) return 1;
    return 2;
  };

  return [...problems].sort((a, b) => {
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    const tb = new Date(b.createdAt || 0).getTime();
    const ta = new Date(a.createdAt || 0).getTime();
    return tb - ta;
  });
}

export function getProblem(id) {
  const problem = load().problems.find((p) => p.id === id) || null;
  if (!problem) return null;
  return {
    ...problem,
    approach: problem.approach?.trim() || "",
    solution: problem.solution?.trim() || "",
  };
}

export async function createProblem(data) {
  const db = load();
  const now = new Date().toISOString();
  const today = todayKey();
  const slug = data.leetcodeSlug?.trim();

  if (slug) {
    const existing = findProblemByLeetcodeSlug(slug);
    if (existing) {
      const err = new Error(`"${existing.title}" is already in your problem list.`);
      err.code = "DUPLICATE_SLUG";
      throw err;
    }
  }

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
    approach: data.approach?.trim() || "",
    solution: data.solution?.trim() || "",
    timeComplexity: data.timeComplexity?.trim() || "",
    spaceComplexity: data.spaceComplexity?.trim() || "",
    missionType: data.missionType || null,
    inMission: Boolean(data.inMission),
    missionDone: false,
    missionDate: data.inMission ? today : null,
    nextReviewAt: data.nextReviewAt || null,
    lastReviewAt: null,
    reviewStage: Number.isFinite(data.reviewStage) ? data.reviewStage : 0,
    solvedAt: null,
    startedAt: data.startedAt || null,
    actualSolveMinutes: data.actualSolveMinutes ?? null,
    source: data.source || "manual",
    roadmapTopicId: data.roadmapTopicId || null,
    createdAt: now,
    updatedAt: now,
  };

  if (!problem.topic) {
    problem.topic = inferProblemTopic(problem);
  }

  db.problems.unshift(problem);
  const activity = logActivity({
    action: "Added",
    problemId: problem.id,
    problemTitle: problem.title,
    topic: problem.topic,
  });

  if (isRemoteMode()) {
    await apiCreateProblem(problem);
    await syncActivityRemote(activity);
  }

  touch();
  return problem;
}

export async function updateProblem(id, updates, { silent = false } = {}) {
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
    const completedAt = new Date().toISOString();
    Object.assign(updated, buildInitialSolveSchedule(
      { ...prev, solvedAt: prev.solvedAt || completedAt, reviewStage: prev.reviewStage ?? 0 },
      completedAt,
    ));
    updated.status = "mastered";
  }

  if (!String(updated.topic || "").trim()) {
    updated.topic = inferProblemTopic(updated);
  }

  db.problems[idx] = updated;
  let activity = null;
  if (!silent) {
    activity = logActivity({
      action: "Updated",
      problemId: id,
      problemTitle: updated.title,
      topic: updated.topic,
    });
  }

  if (isRemoteMode()) {
    await apiUpdateProblem(id, updated);
    if (activity) await syncActivityRemote(activity);
  }

  touch();
  return updated;
}

export async function deleteProblem(id) {
  const db = load();
  const problem = db.problems.find((p) => p.id === id);
  if (!problem) return false;

  db.problems = db.problems.filter((p) => p.id !== id);
  db.notes = db.notes.filter((n) => n.problemId !== id);
  const activity = logActivity({
    action: "Deleted",
    problemTitle: problem.title,
    topic: problem.topic,
  });

  if (isRemoteMode()) {
    await apiDeleteProblem(id);
    await syncActivityRemote(activity);
  }

  touch();
  return true;
}

/* ── Mission operations ── */

export function getLearningMissionMeta() {
  const meta = load().meta.learningMission || {};
  return {
    topicId: meta.topicId || null,
    assignedDate: meta.assignedDate || null,
  };
}

export function setLearningMissionAssignment(topicId, assignedDate) {
  const db = load();
  db.meta.learningMission = { topicId, assignedDate };
  touch({ silent: true });
  return db.meta.learningMission;
}

export function clearLearningMissionAssignment() {
  const db = load();
  db.meta.learningMission = { topicId: null, assignedDate: null };
  touch({ silent: true });
}

function purgeManualMissions(options = {}) {
  const db = load();
  const purged = [];

  for (let i = 0; i < db.problems.length; i += 1) {
    const p = db.problems[i];
    if (!p.inMission || p.missionType === "revision") continue;

    const cleared = {
      ...p,
      inMission: false,
      missionDate: null,
      missionDone: false,
      missionType: null,
    };
    db.problems[i] = cleared;
    purged.push(cleared);
  }

  if (purged.length) {
    touch(options);
    if (isRemoteMode()) {
      void Promise.all(
        purged.map((p) => apiUpdateProblem(p.id, p).catch((err) => {
          console.warn("[mission] Failed to clear manual mission", p.id, err);
        })),
      );
    }
  }

  return purged.length;
}

export function syncDueRevisionsToMission(options = {}) {
  const db = load();
  const today = todayKey();
  const yesterday = yesterdayKey();
  const synced = [];

  for (let i = 0; i < db.problems.length; i += 1) {
    let problem = db.problems[i];
    let updated = false;

    const backfill = backfillRevisionFields(problem);
    if (backfill) {
      problem = { ...problem, ...backfill };
      updated = true;
    }

    if (shouldEnqueueRevision(problem, today, yesterday)) {
      problem = { ...problem, ...buildMissionEnqueuePatch(today) };
      updated = true;
    }

    if (updated) {
      db.problems[i] = problem;
      synced.push(problem);
    }
  }

  if (synced.length) {
    touch(options);
    if (isRemoteMode()) {
      void Promise.all(
        synced.map((p) => apiUpdateProblem(p.id, p).catch((err) => {
          console.warn("[revision] Failed to sync problem", p.id, err);
        })),
      );
    }
  }

  return synced.length;
}

export function getTodaysMissionProblems() {
  purgeManualMissions({ silent: true });
  syncDueRevisionsToMission({ silent: true });
  const today = todayKey();
  const yesterday = yesterdayKey();
  return load().problems.filter((p) => {
    if (!p.inMission || p.missionType !== "revision") return false;
    if (p.missionDate === today) return true;
    if (p.missionDate === yesterday && !p.missionDone) return true;
    return false;
  });
}

export async function addToMission(id, missionType = "new") {
  const today = todayKey();
  return updateProblem(id, {
    inMission: true,
    missionDate: today,
    missionType,
    missionDone: false,
  });
}

export async function removeFromMission(id) {
  return updateProblem(id, {
    inMission: false,
    missionDate: null,
    missionDone: false,
    missionType: null,
  });
}

export async function completeMissionWithSolution(id, solutionData = {}) {
  const problem = getProblem(id);
  if (!problem || problem.missionDone) return problem;

  const completedAt = new Date().toISOString();
  const updates = {
    missionDone: true,
    lastReviewAt: completedAt,
    attempts: (problem.attempts || 0) + 1,
    ...buildSolutionCompletionFields(solutionData, problem),
  };

  if (problem.startedAt) {
    updates.actualSolveMinutes = computeActualSolveMinutes(problem);
    updates.startedAt = null;
  }

  if (problem.missionType === "revision") {
    Object.assign(updates, buildRevisionCompleteSchedule(problem, completedAt));
  } else {
    Object.assign(updates, buildInitialSolveSchedule(problem, completedAt));
    updates.status = "mastered";
  }

  const activity = logActivity({
    action: problem.missionType === "revision" ? "Reviewed" : "Solved",
    problemId: id,
    problemTitle: problem.title,
    topic: problem.topic,
  });
  const result = await updateProblem(id, updates, { silent: true });
  if (isRemoteMode()) await syncActivityRemote(activity);
  return result;
}

export async function toggleMissionDone(id, solutionData = null) {
  const problem = getProblem(id);
  if (!problem) return null;

  const missionDone = !problem.missionDone;
  const updates = { missionDone };

  if (missionDone) {
    if (solutionData) {
      return completeMissionWithSolution(id, solutionData);
    }

    const completedAt = new Date().toISOString();
    updates.lastReviewAt = completedAt;
    updates.attempts = (problem.attempts || 0) + 1;
    if (problem.startedAt) {
      updates.actualSolveMinutes = computeActualSolveMinutes(problem);
      updates.startedAt = null;
    }

    if (problem.missionType === "revision") {
      Object.assign(updates, buildRevisionCompleteSchedule(problem, completedAt));
    } else {
      Object.assign(updates, buildInitialSolveSchedule(problem, completedAt));
      updates.status = "mastered";
    }

    const activity = logActivity({
      action: problem.missionType === "revision" ? "Reviewed" : "Solved",
      problemId: id,
      problemTitle: problem.title,
      topic: problem.topic,
    });
    const result = await updateProblem(id, updates, { silent: true });
    if (isRemoteMode()) await syncActivityRemote(activity);
    return result;
  }

  return updateProblem(id, updates, { silent: true });
}

export function getProblemsInProgress() {
  return getProblems().filter(
    (p) => p.startedAt && p.status !== "mastered",
  );
}

export async function startProblemSolve(id) {
  const problem = getProblem(id);
  if (!problem) return null;

  if (problem.startedAt && problem.status !== "mastered") {
    return problem;
  }

  return updateProblem(id, {
    startedAt: new Date().toISOString(),
    status: problem.status === "todo" ? "learning" : problem.status,
  }, { silent: true });
}

export async function clearProblemSolveTimer(id) {
  return updateProblem(id, { startedAt: null }, { silent: true });
}

function computeActualSolveMinutes(problem) {
  if (!problem?.startedAt) return problem?.actualSolveMinutes ?? null;
  const elapsed = Date.now() - new Date(problem.startedAt).getTime();
  return Math.max(1, Math.round(elapsed / 60000));
}

function buildSolutionCompletionFields(solutionData = {}, problem = {}) {
  return {
    approach: (solutionData.approach ?? problem.approach ?? "").trim(),
    solution: (solutionData.solution ?? problem.solution ?? "").trim(),
    timeComplexity: (solutionData.timeComplexity ?? problem.timeComplexity ?? "").trim(),
    spaceComplexity: (solutionData.spaceComplexity ?? problem.spaceComplexity ?? "").trim(),
    complexityExplanation: (solutionData.complexityExplanation ?? problem.complexityExplanation ?? "").trim(),
    solutionSuggestions: (solutionData.solutionSuggestions ?? problem.solutionSuggestions ?? "").trim(),
  };
}

export async function markProblemSolved(id, solutionData = null) {
  const problem = getProblem(id);
  if (!problem) return null;

  const completedAt = new Date().toISOString();
  const actualSolveMinutes = computeActualSolveMinutes(problem);
  const patch = {
    status: "mastered",
    missionDone: true,
    attempts: (problem.attempts || 0) + 1,
    startedAt: null,
    actualSolveMinutes,
    ...buildInitialSolveSchedule(problem, completedAt),
    ...(solutionData ? buildSolutionCompletionFields(solutionData, problem) : {}),
  };

  if (!problem.pattern?.trim()) {
    const { resolveProblemPattern } = await import("./pattern-resolver.js");
    const inferred = resolveProblemPattern(problem);
    if (inferred) patch.pattern = inferred;
  }

  const activity = logActivity({
    action: "Solved",
    problemId: id,
    problemTitle: problem.title,
    topic: problem.topic,
  });
  const result = await updateProblem(id, patch, { silent: true });
  if (isRemoteMode()) await syncActivityRemote(activity);
  return result;
}

export async function recordFailedAttempt(id) {
  const problem = getProblem(id);
  if (!problem) return null;

  const activity = logActivity({
    action: "Failed attempt",
    problemId: id,
    problemTitle: problem.title,
    topic: problem.topic,
  });
  const result = await updateProblem(id, {
    status: "struggling",
    attempts: (problem.attempts || 0) + 1,
  }, { silent: true });
  if (isRemoteMode()) await syncActivityRemote(activity);
  return result;
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

export function getCalendarSelectedDate() {
  return load().meta.calendarSelectedDate || todayKey();
}

export function setCalendarSelectedDate(dateKey) {
  const db = load();
  db.meta.calendarSelectedDate = dateKey;
  touch({ silent: true });
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

export function getTourState() {
  const db = load();
  if (!db.meta.tour) {
    db.meta.tour = { completed: false, dismissed: false };
  }
  return { ...db.meta.tour };
}

export function updateTourState(updates) {
  const db = load();
  if (!db.meta.tour) {
    db.meta.tour = { completed: false, dismissed: false };
  }
  db.meta.tour = { ...db.meta.tour, ...updates };
  touch({ silent: true });
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

function buildStudyLocalSnapshot(db) {
  return {
    notes: Array.isArray(db.notes) ? db.notes : [],
    searchRecent: Array.isArray(db.searchRecent) ? db.searchRecent : [],
    meta: {
      longestStreak: db.meta?.longestStreak || 0,
      calendarMonth: db.meta?.calendarMonth || {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
      },
    },
  };
}

function applyClearedStudyData(preserved) {
  const fresh = defaultDB();
  cache = {
    ...fresh,
    user: preserved.user,
    settings: preserved.settings,
    problems: [],
    notes: [],
    activities: [],
    searchRecent: [],
    meta: {
      ...fresh.meta,
      readNotificationIds: preserved.meta?.readNotificationIds || [],
      tour: preserved.meta?.tour || fresh.meta.tour,
    },
  };
  touch();
  return cache;
}

export async function clearAllData() {
  const db = load();
  const preserved = {
    user: { ...db.user },
    settings: {
      ...db.settings,
      notifications: { ...db.settings.notifications },
    },
    meta: {
      readNotificationIds: [...(db.meta?.readNotificationIds || [])],
      tour: db.meta?.tour ? { ...db.meta.tour } : undefined,
    },
  };

  if (isRemoteMode()) {
    await apiClearUserData(buildStudyLocalSnapshot(db));
  }

  return applyClearedStudyData(preserved);
}