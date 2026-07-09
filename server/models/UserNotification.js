/**
 * Per-user notifications — access changes, admin actions, etc.
 */

import mongoose from "mongoose";

const userNotificationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    variant: {
      type: String,
      enum: ["default", "success", "warning", "danger", "info", "accent"],
      default: "info",
    },
    href: {
      type: String,
      default: "#/settings",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    collection: "user_notifications",
    timestamps: true,
    versionKey: false,
  },
);

userNotificationSchema.index({ userId: 1, createdAt: -1 });

export const UserNotification = mongoose.models.UserNotification
  || mongoose.model("UserNotification", userNotificationSchema);