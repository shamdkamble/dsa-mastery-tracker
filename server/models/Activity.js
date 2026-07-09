/**
 * User activity log — MongoDB `activities` collection (per-user)
 */

import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    problemId: { type: String, default: null },
    problemTitle: { type: String, default: "" },
    topic: { type: String, default: "" },
    timestamp: { type: String, required: true },
  },
  {
    collection: "activities",
    versionKey: false,
  },
);

activitySchema.index({ userId: 1, id: 1 }, { unique: true });
activitySchema.index({ userId: 1, timestamp: -1 });

export const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema);

export function toActivityDto(doc) {
  if (!doc) return null;
  const a = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = a;
  return rest;
}