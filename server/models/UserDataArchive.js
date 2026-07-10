/**
 * Archived study data snapshot — kept when a candidate clears their data.
 * Admins can restore snapshots back to the candidate account.
 */

import mongoose from "mongoose";

const userDataArchiveSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    archivedAt: { type: String, required: true },
    restoredAt: { type: String, default: null },
    clientAppliedAt: { type: String, default: null },
    problems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    activities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    roadmapProgress: {
      completedTopicIds: { type: [String], default: [] },
    },
    localSnapshot: {
      notes: { type: [mongoose.Schema.Types.Mixed], default: [] },
      searchRecent: { type: [String], default: [] },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    stats: {
      problemCount: { type: Number, default: 0 },
      activityCount: { type: Number, default: 0 },
      noteCount: { type: Number, default: 0 },
    },
  },
  {
    collection: "user_data_archives",
    versionKey: false,
  },
);

userDataArchiveSchema.index({ userId: 1, archivedAt: -1 });

export const UserDataArchive = mongoose.models.UserDataArchive
  || mongoose.model("UserDataArchive", userDataArchiveSchema);

export function toArchiveSummaryDto(doc) {
  if (!doc) return null;
  const a = doc.toObject ? doc.toObject() : doc;
  return {
    id: a.id,
    userId: a.userId,
    archivedAt: a.archivedAt,
    restoredAt: a.restoredAt,
    stats: a.stats || {},
  };
}