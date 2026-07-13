/**
 * Per-user problems & activities — MongoDB persistence
 */

import { randomUUID } from "node:crypto";
import { Problem, toProblemDto } from "./models/Problem.js";
import { Activity, toActivityDto } from "./models/Activity.js";
import { UserDataArchive, toArchiveSummaryDto } from "./models/UserDataArchive.js";
import { resetUserRoadmapProgress, getUserRoadmapProgress } from "./lesson-store.js";

export class UserDataError extends Error {
  constructor(message, { status = 400, code = "DATA_ERROR" } = {}) {
    super(message);
    this.name = "UserDataError";
    this.status = status;
    this.code = code;
  }
}

const PROBLEM_FIELDS = [
  "title", "topic", "pattern", "difficulty", "status", "attempts", "estimatedMinutes",
  "leetcodeUrl", "leetcodeSlug", "leetcodeId", "topicTags", "approach", "solution",
  "timeComplexity", "spaceComplexity", "complexityExplanation", "solutionSuggestions",
  "missionType", "inMission", "missionDone",
  "missionDate", "nextReviewAt", "lastReviewAt", "reviewStage", "solvedAt", "startedAt", "actualSolveMinutes",
  "source", "roadmapTopicId", "createdAt", "updatedAt",
];

function pickProblemFields(data) {
  const out = {};
  for (const key of PROBLEM_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

function sortProblems(problems) {
  return [...problems].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function sortActivities(activities) {
  return [...activities].sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return tb - ta;
  });
}

export async function getUserData(userId) {
  const [problems, activities, pendingRestore] = await Promise.all([
    Problem.find({ userId }).lean(),
    Activity.find({ userId }).lean(),
    UserDataArchive.findOne({
      userId,
      restoredAt: { $ne: null },
      clientAppliedAt: null,
    }).sort({ restoredAt: -1 }).lean(),
  ]);

  const payload = {
    problems: sortProblems(problems.map(toProblemDto)),
    activities: sortActivities(activities.map(toActivityDto)),
  };

  if (pendingRestore?.localSnapshot) {
    payload.localRestore = pendingRestore.localSnapshot;
    payload.localRestoreArchiveId = pendingRestore.id;
  }

  return payload;
}

export async function acknowledgeLocalRestore(userId, archiveId) {
  if (!archiveId) return { ok: true };
  await UserDataArchive.updateOne(
    { userId, id: archiveId, clientAppliedAt: null },
    { $set: { clientAppliedAt: new Date().toISOString() } },
  );
  return { ok: true };
}

export async function createProblem(userId, data) {
  if (!data?.id) {
    throw new UserDataError("Problem id is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const existing = await Problem.findOne({ userId, id: data.id });
  if (existing) {
    throw new UserDataError("Problem already exists.", { status: 409, code: "DUPLICATE" });
  }

  const slug = String(data.leetcodeSlug || "").trim().toLowerCase();
  if (slug) {
    const slugDup = await Problem.findOne({
      userId,
      leetcodeSlug: { $regex: new RegExp(`^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    }).lean();
    if (slugDup) {
      throw new UserDataError(
        `"${slugDup.title}" is already in your problem list.`,
        { status: 409, code: "DUPLICATE_SLUG" },
      );
    }
  }

  const now = new Date().toISOString();
  const doc = await Problem.create({
    userId,
    id: data.id,
    ...pickProblemFields(data),
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
  });

  return toProblemDto(doc);
}

export async function updateProblemRecord(userId, id, updates) {
  const doc = await Problem.findOne({ userId, id });
  if (!doc) {
    throw new UserDataError("Problem not found.", { status: 404, code: "NOT_FOUND" });
  }

  const fields = pickProblemFields(updates);
  fields.updatedAt = updates.updatedAt || new Date().toISOString();

  Object.assign(doc, fields);
  await doc.save();

  return toProblemDto(doc);
}

export async function deleteProblemRecord(userId, id) {
  const result = await Problem.deleteOne({ userId, id });
  if (!result.deletedCount) {
    throw new UserDataError("Problem not found.", { status: 404, code: "NOT_FOUND" });
  }

  await Activity.deleteMany({ userId, problemId: id });
  return true;
}

export async function createActivity(userId, data) {
  if (!data?.id || !data?.action) {
    throw new UserDataError("Activity id and action are required.", { status: 400, code: "INVALID_INPUT" });
  }

  const doc = await Activity.create({
    userId,
    id: data.id,
    action: data.action,
    problemId: data.problemId ?? null,
    problemTitle: data.problemTitle ?? "",
    topic: data.topic ?? "",
    timestamp: data.timestamp || new Date().toISOString(),
  });

  return toActivityDto(doc);
}

export async function migrateUserData(userId, { problems = [], activities = [] } = {}) {
  if (!Array.isArray(problems)) {
    throw new UserDataError("problems must be an array.", { status: 400, code: "INVALID_INPUT" });
  }

  const existingCount = await Problem.countDocuments({ userId });
  if (existingCount > 0) {
    throw new UserDataError(
      "Account already has cloud data. Migration skipped.",
      { status: 409, code: "ALREADY_MIGRATED" },
    );
  }

  if (!problems.length) {
    return { problems: [], activities: [], migratedProblems: 0, migratedActivities: 0 };
  }

  const problemDocs = problems.map((p) => ({
    userId,
    id: p.id,
    ...pickProblemFields(p),
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  }));

  await Problem.insertMany(problemDocs, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err;
  });

  let activityDocs = [];
  if (Array.isArray(activities) && activities.length) {
    activityDocs = activities.slice(0, 200).map((a) => ({
      userId,
      id: a.id,
      action: a.action,
      problemId: a.problemId ?? null,
      problemTitle: a.problemTitle ?? "",
      topic: a.topic ?? "",
      timestamp: a.timestamp || new Date().toISOString(),
    }));

    await Activity.insertMany(activityDocs, { ordered: false }).catch((err) => {
      if (err.code !== 11000) throw err;
    });
  }

  return getUserData(userId).then((data) => ({
    ...data,
    migratedProblems: problemDocs.length,
    migratedActivities: activityDocs.length,
  }));
}

function stripMongoFields(doc) {
  if (!doc) return doc;
  const { _id, __v, userId, ...rest } = doc;
  return rest;
}

async function bulkInsertProblems(userId, problems) {
  if (!problems.length) return 0;

  const docs = problems.map((p) => ({
    userId,
    id: p.id,
    ...pickProblemFields(p),
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  }));

  await Problem.insertMany(docs, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err;
  });

  return docs.length;
}

async function bulkInsertActivities(userId, activities) {
  if (!activities.length) return 0;

  const docs = activities.slice(0, 200).map((a) => ({
    userId,
    id: a.id,
    action: a.action,
    problemId: a.problemId ?? null,
    problemTitle: a.problemTitle ?? "",
    topic: a.topic ?? "",
    timestamp: a.timestamp || new Date().toISOString(),
  }));

  await Activity.insertMany(docs, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err;
  });

  return docs.length;
}

/**
 * Archive and wipe all study data for a candidate. Profile/account is untouched.
 */
export async function clearUserStudyData(userId, { localSnapshot = {} } = {}) {
  const [problems, activities, roadmapProgress] = await Promise.all([
    Problem.find({ userId }).lean(),
    Activity.find({ userId }).lean(),
    getUserRoadmapProgress(userId),
  ]);

  const notes = Array.isArray(localSnapshot.notes) ? localSnapshot.notes : [];
  const searchRecent = Array.isArray(localSnapshot.searchRecent) ? localSnapshot.searchRecent : [];
  const meta = localSnapshot.meta && typeof localSnapshot.meta === "object" ? localSnapshot.meta : {};

  const hasData = problems.length > 0
    || activities.length > 0
    || (roadmapProgress.completedTopicIds?.length > 0)
    || notes.length > 0
    || searchRecent.length > 0
    || Object.keys(meta).length > 0;

  let archive = null;

  if (hasData) {
    const archiveId = randomUUID();
    const archivedAt = new Date().toISOString();

    archive = await UserDataArchive.create({
      id: archiveId,
      userId,
      archivedAt,
      problems: problems.map((p) => stripMongoFields(toProblemDto(p))),
      activities: activities.map((a) => stripMongoFields(toActivityDto(a))),
      roadmapProgress: {
        completedTopicIds: roadmapProgress.completedTopicIds || [],
      },
      localSnapshot: { notes, searchRecent, meta },
      stats: {
        problemCount: problems.length,
        activityCount: activities.length,
        noteCount: notes.length,
      },
    });
  }

  await Promise.all([
    Problem.deleteMany({ userId }),
    Activity.deleteMany({ userId }),
    resetUserRoadmapProgress(userId),
  ]);

  return {
    ok: true,
    archiveId: archive?.id || null,
    cleared: {
      problems: problems.length,
      activities: activities.length,
      roadmapTopics: roadmapProgress.completedTopicIds?.length || 0,
      notes: notes.length,
    },
  };
}

export async function listUserDataArchives(userId) {
  const docs = await UserDataArchive.find({ userId })
    .sort({ archivedAt: -1 })
    .lean();

  return docs.map(toArchiveSummaryDto);
}

export async function restoreUserStudyData(userId, { archiveId } = {}) {
  const query = archiveId
    ? { userId, id: archiveId }
    : { userId, restoredAt: null };

  const archive = archiveId
    ? await UserDataArchive.findOne(query).lean()
    : await UserDataArchive.findOne(query).sort({ archivedAt: -1 }).lean();

  if (!archive) {
    throw new UserDataError(
      archiveId ? "Archive not found." : "No restorable archive found for this user.",
      { status: 404, code: "NOT_FOUND" },
    );
  }

  await Promise.all([
    Problem.deleteMany({ userId }),
    Activity.deleteMany({ userId }),
    resetUserRoadmapProgress(userId),
  ]);

  const problems = Array.isArray(archive.problems) ? archive.problems : [];
  const activities = Array.isArray(archive.activities) ? archive.activities : [];
  const completedTopicIds = archive.roadmapProgress?.completedTopicIds || [];

  await bulkInsertProblems(userId, problems);
  await bulkInsertActivities(userId, activities);

  if (completedTopicIds.length) {
    const { RoadmapProgress } = await import("./models/RoadmapProgress.js");
    await RoadmapProgress.findOneAndUpdate(
      { userId },
      { $set: { completedTopicIds } },
      { upsert: true, new: true },
    );
  }

  await UserDataArchive.updateOne(
    { id: archive.id },
    { $set: { restoredAt: new Date().toISOString() } },
  );

  const data = await getUserData(userId);

  return {
    ok: true,
    archiveId: archive.id,
    restored: {
      problems: problems.length,
      activities: activities.length,
      roadmapTopics: completedTopicIds.length,
      notes: archive.localSnapshot?.notes?.length || 0,
    },
    localSnapshot: archive.localSnapshot || {},
    ...data,
  };
}