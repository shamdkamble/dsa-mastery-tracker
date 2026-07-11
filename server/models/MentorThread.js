/**
 * Mentor chat thread — one per student (1:1 with admin)
 */

import mongoose from "mongoose";

const mentorThreadSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    studentId: { type: String, required: true, index: true, unique: true },
    studentName: { type: String, default: "" },
    studentEmail: { type: String, default: "" },
    lastMessageAt: { type: String, default: null, index: true },
    lastMessagePreview: { type: String, default: "" },
    lastSenderRole: { type: String, default: null },
    unreadByAdmin: { type: Number, default: 0 },
    unreadByStudent: { type: Number, default: 0 },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "mentor_threads",
    versionKey: false,
  },
);

mentorThreadSchema.index({ id: 1 }, { unique: true });

export const MentorThread = mongoose.models.MentorThread
  || mongoose.model("MentorThread", mentorThreadSchema);

export function toMentorThreadDto(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = d;
  return rest;
}