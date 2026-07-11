/**
 * Mentor chat message
 */

import mongoose from "mongoose";

const mentorMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    threadId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ["user", "tester", "admin"], required: true },
    senderName: { type: String, default: "" },
    body: { type: String, required: true },
    createdAt: { type: String, required: true, index: true },
  },
  {
    collection: "mentor_messages",
    versionKey: false,
  },
);

mentorMessageSchema.index({ id: 1 }, { unique: true });
mentorMessageSchema.index({ threadId: 1, createdAt: 1 });

export const MentorMessage = mongoose.models.MentorMessage
  || mongoose.model("MentorMessage", mentorMessageSchema);

export function toMentorMessageDto(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = d;
  return rest;
}