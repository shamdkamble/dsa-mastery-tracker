/**
 * User problem — MongoDB `problems` collection (per-user)
 */

import mongoose from "mongoose";

const problemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, default: "Untitled" },
    topic: { type: String, default: "" },
    pattern: { type: String, default: "" },
    difficulty: { type: String, default: "Medium" },
    status: { type: String, default: "todo" },
    attempts: { type: Number, default: 0 },
    estimatedMinutes: { type: Number, default: 30 },
    leetcodeUrl: { type: String, default: null },
    leetcodeSlug: { type: String, default: null },
    leetcodeId: { type: String, default: null },
    topicTags: { type: [String], default: [] },
    solution: { type: String, default: "" },
    timeComplexity: { type: String, default: "" },
    spaceComplexity: { type: String, default: "" },
    missionType: { type: String, default: null },
    inMission: { type: Boolean, default: false },
    missionDone: { type: Boolean, default: false },
    missionDate: { type: String, default: null },
    nextReviewAt: { type: String, default: null },
    lastReviewAt: { type: String, default: null },
    solvedAt: { type: String, default: null },
    startedAt: { type: String, default: null },
    actualSolveMinutes: { type: Number, default: null },
    source: { type: String, default: "manual" },
    roadmapTopicId: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "problems",
    versionKey: false,
  },
);

problemSchema.index({ userId: 1, id: 1 }, { unique: true });
problemSchema.index({ userId: 1, updatedAt: -1 });

export const Problem = mongoose.models.Problem || mongoose.model("Problem", problemSchema);

export function toProblemDto(doc) {
  if (!doc) return null;
  const p = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = p;
  return rest;
}