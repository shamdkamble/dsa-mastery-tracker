/**
 * Per-user problems & activities — MongoDB persistence
 */

import { Problem, toProblemDto } from "./models/Problem.js";
import { Activity, toActivityDto } from "./models/Activity.js";

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
  "leetcodeUrl", "leetcodeSlug", "leetcodeId", "topicTags", "solution",
  "timeComplexity", "spaceComplexity", "missionType", "inMission", "missionDone",
  "missionDate", "nextReviewAt", "lastReviewAt", "solvedAt", "createdAt", "updatedAt",
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
  const [problems, activities] = await Promise.all([
    Problem.find({ userId }).lean(),
    Activity.find({ userId }).lean(),
  ]);

  return {
    problems: sortProblems(problems.map(toProblemDto)),
    activities: sortActivities(activities.map(toActivityDto)),
  };
}

export async function createProblem(userId, data) {
  if (!data?.id) {
    throw new UserDataError("Problem id is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const existing = await Problem.findOne({ userId, id: data.id });
  if (existing) {
    throw new UserDataError("Problem already exists.", { status: 409, code: "DUPLICATE" });
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