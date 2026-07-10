/**
 * Per-user notification preferences (server-synced for scheduled push)
 */

import mongoose from "mongoose";

const notificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    dailyReminder: {
      type: Boolean,
      default: true,
    },
    streakAlert: {
      type: Boolean,
      default: true,
    },
    reviewDue: {
      type: Boolean,
      default: true,
    },
    weeklySummary: {
      type: Boolean,
      default: false,
    },
    dailyWisdom: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
    },
  },
  {
    collection: "notification_preferences",
    timestamps: true,
    versionKey: false,
  },
);

export const NotificationPreferences = mongoose.models.NotificationPreferences
  || mongoose.model("NotificationPreferences", notificationPreferencesSchema);