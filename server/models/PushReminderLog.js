/**
 * Dedupes scheduled push reminders — one send per user/type/day
 */

import mongoose from "mongoose";

const pushReminderLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    reminderType: {
      type: String,
      required: true,
      enum: ["daily-mission", "streak-risk", "review-due", "weekly-summary"],
    },
    dateKey: {
      type: String,
      required: true,
    },
  },
  {
    collection: "push_reminder_logs",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

pushReminderLogSchema.index({ userId: 1, reminderType: 1, dateKey: 1 }, { unique: true });

export const PushReminderLog = mongoose.models.PushReminderLog
  || mongoose.model("PushReminderLog", pushReminderLogSchema);