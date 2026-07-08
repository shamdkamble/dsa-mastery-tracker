/**
 * User model — MongoDB Atlas `users` collection
 */

import mongoose from "mongoose";
import { ACCESS_LEVELS, USER_STATUSES } from "../user-constants.js";

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: "pending",
      index: true,
    },
    accessLevel: {
      type: String,
      enum: ACCESS_LEVELS,
      default: "standard",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "users",
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ status: 1, createdAt: -1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);