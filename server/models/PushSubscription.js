/**
 * Web Push subscriptions — one document per browser/device endpoint
 */

import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "push_subscriptions",
    timestamps: true,
    versionKey: false,
  },
);

pushSubscriptionSchema.index({ userId: 1, updatedAt: -1 });

export const PushSubscription = mongoose.models.PushSubscription
  || mongoose.model("PushSubscription", pushSubscriptionSchema);