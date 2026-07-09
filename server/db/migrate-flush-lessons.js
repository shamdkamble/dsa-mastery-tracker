/**
 * One-time flush of cached AI lessons after mentor-style prompt refresh.
 */

import mongoose from "mongoose";
import { Lesson } from "../models/Lesson.js";

const MIGRATION_ID = "flush-lessons-beginner-structure-v2";

const migrationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ranAt: { type: Date, default: Date.now },
  },
  { collection: "app_migrations", versionKey: false },
);

const AppMigration = mongoose.models.AppMigration || mongoose.model("AppMigration", migrationSchema);

/**
 * Delete all cached lessons once so every user gets the new 4-section beginner format.
 */
export async function flushLessonsForMentorPromptRefresh() {
  const existing = await AppMigration.findOne({ id: MIGRATION_ID }).lean();
  if (existing) return { flushed: 0, skipped: true };

  const result = await Lesson.deleteMany({});
  await AppMigration.create({ id: MIGRATION_ID });

  return { flushed: result.deletedCount ?? 0, skipped: false };
}