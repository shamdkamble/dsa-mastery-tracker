/**
 * Per-topic YouTube walkthrough — optional secondary learn format
 */

import mongoose from "mongoose";

const topicVideoSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true, unique: true, index: true },
    topicName: { type: String, default: "" },
    phase: { type: Number, default: null },
    youtubeUrl: { type: String, required: true },
    videoId: { type: String, required: true },
    title: { type: String, default: "" },
    updatedBy: { type: String, default: null },
  },
  {
    collection: "topic_videos",
    timestamps: true,
    versionKey: false,
  },
);

export const TopicVideo = mongoose.models.TopicVideo
  || mongoose.model("TopicVideo", topicVideoSchema);

export function toTopicVideoDto(doc) {
  if (!doc) return null;
  const v = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = v;
  return {
    ...rest,
    updatedAt: v.updatedAt ? new Date(v.updatedAt).toISOString() : null,
    createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : null,
  };
}