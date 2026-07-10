/**
 * Cached learning hook facts per roadmap topic (shared across users)
 */

import mongoose from "mongoose";

const topicLearningFactSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    phase: {
      type: Number,
      default: null,
    },
    topicName: {
      type: String,
      default: "",
      trim: true,
    },
    hookStyle: {
      type: String,
      enum: ["curiosity", "interview", "analogy", "history", "seed", "admin", "snack"],
      default: "curiosity",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    deepLink: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ["seed", "gemini", "admin"],
      default: "seed",
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    collection: "topic_learning_facts",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

topicLearningFactSchema.index({ topicId: 1, active: 1, createdAt: -1 });

export const TopicLearningFact = mongoose.models.TopicLearningFact
  || mongoose.model("TopicLearningFact", topicLearningFactSchema);