/**
 * Cached AI lessons — global per topicId (shared across users)
 */

import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    content: { type: String, default: "" },
    model: { type: String, default: null },
    generatedAt: { type: String, default: null },
  },
  { _id: false },
);

const lessonSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true, unique: true, index: true },
    topicName: { type: String, default: "" },
    phase: { type: Number, default: null },
    difficulty: { type: String, default: "" },
    track: { type: String, default: "" },
    standard: { type: variantSchema, default: () => ({}) },
    simpler: { type: variantSchema, default: () => ({}) },
  },
  {
    collection: "lessons",
    timestamps: true,
    versionKey: false,
  },
);

export const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);

export function toLessonDto(doc) {
  if (!doc) return null;
  const l = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = l;
  return rest;
}