/**
 * Tracks which learning facts were delivered to which user
 */

import mongoose from "mongoose";

const userFactDeliverySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    factId: {
      type: String,
      required: true,
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    notificationId: {
      type: String,
      default: null,
    },
    channel: {
      type: String,
      enum: ["push", "in_app", "both"],
      default: "both",
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: "user_fact_deliveries",
    versionKey: false,
  },
);

userFactDeliverySchema.index({ userId: 1, factId: 1 }, { unique: true });
userFactDeliverySchema.index({ userId: 1, topicId: 1, deliveredAt: -1 });

export const UserFactDelivery = mongoose.models.UserFactDelivery
  || mongoose.model("UserFactDelivery", userFactDeliverySchema);