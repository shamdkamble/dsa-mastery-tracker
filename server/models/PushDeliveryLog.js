/**
 * Audit log for Web Push delivery attempts
 */

import mongoose from "mongoose";

const pushDeliveryLogSchema = new mongoose.Schema(
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
    userName: {
      type: String,
      default: "",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["access", "test", "reminder", "redelivery"],
      index: true,
    },
    eventTag: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    notificationId: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      default: "",
      trim: true,
    },
    pushTag: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["sent", "failed", "skipped"],
      index: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    errorCode: {
      type: Number,
      default: null,
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
    endpointPreview: {
      type: String,
      default: "",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    devicesSent: {
      type: Number,
      default: 0,
    },
    devicesFailed: {
      type: Number,
      default: 0,
    },
    devicesTotal: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "push_delivery_logs",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

pushDeliveryLogSchema.index({ createdAt: -1 });
pushDeliveryLogSchema.index({ userId: 1, createdAt: -1 });

export const PushDeliveryLog = mongoose.models.PushDeliveryLog
  || mongoose.model("PushDeliveryLog", pushDeliveryLogSchema);