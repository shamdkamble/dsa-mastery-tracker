/**
 * Per-user roadmap completion progress
 */

import mongoose from "mongoose";

const roadmapProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    completedTopicIds: { type: [String], default: [] },
  },
  {
    collection: "roadmap_progress",
    timestamps: true,
    versionKey: false,
  },
);

export const RoadmapProgress = mongoose.models.RoadmapProgress
  || mongoose.model("RoadmapProgress", roadmapProgressSchema);

export function toProgressDto(doc) {
  if (!doc) return { userId: null, completedTopicIds: [] };
  const p = doc.toObject ? doc.toObject() : doc;
  return {
    userId: p.userId,
    completedTopicIds: Array.isArray(p.completedTopicIds) ? p.completedTopicIds : [],
    updatedAt: p.updatedAt,
  };
}