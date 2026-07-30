/**
 * EngineerOS learning progress — same MongoDB as DSA Mantra, per-user document.
 */

import mongoose from "mongoose";

const journalEntrySchema = new mongoose.Schema(
  {
    id: String,
    date: String,
    day: Number,
    learned: String,
    confused: String,
    pattern: String,
    confidence: Number,
    createdAt: String,
  },
  { _id: false },
);

const mistakeEntrySchema = new mongoose.Schema(
  {
    id: String,
    problemName: String,
    mistake: String,
    correctThinking: String,
    lessonLearned: String,
    revisionDate: String,
    createdAt: String,
    revised: Boolean,
  },
  { _id: false },
);

const revisionItemSchema = new mongoose.Schema(
  {
    id: String,
    chapterId: String,
    chapterTitle: String,
    completedAt: String,
    nextReviewAt: String,
    intervalDays: Number,
    reviewCount: Number,
  },
  { _id: false },
);

const studySessionSchema = new mongoose.Schema(
  {
    date: String,
    minutes: Number,
  },
  { _id: false },
);

const settingsSchema = new mongoose.Schema(
  {
    dailyGoalMinutes: { type: Number, default: 120 },
    soundEnabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const engineerOsProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    started: { type: Boolean, default: false },
    currentWeek: { type: Number, default: 1 },
    currentDay: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    lastStudyDate: { type: String, default: null },
    hoursStudiedMinutes: { type: Number, default: 0 },
    leetcodeSolved: { type: Number, default: 0 },
    conceptsCompleted: { type: [String], default: [] },
    chaptersCompleted: { type: [String], default: [] },
    quizScores: { type: mongoose.Schema.Types.Mixed, default: {} },
    confidence: { type: Number, default: 0 },
    missionProgress: { type: Number, default: 0 },
    consistencyDays: { type: Number, default: 0 },
    checklist: { type: mongoose.Schema.Types.Mixed, default: {} },
    dailyMissionsCompleted: { type: [Number], default: [] },
    journal: { type: [journalEntrySchema], default: [] },
    mistakes: { type: [mistakeEntrySchema], default: [] },
    revisions: { type: [revisionItemSchema], default: [] },
    studySessions: { type: [studySessionSchema], default: [] },
    week1Complete: { type: Boolean, default: false },
    name: { type: String, default: "" },
    settings: { type: settingsSchema, default: () => ({}) },
  },
  {
    collection: "engineer_os_progress",
    timestamps: true,
    versionKey: false,
  },
);

export const EngineerOsProgress =
  mongoose.models.EngineerOsProgress ||
  mongoose.model("EngineerOsProgress", engineerOsProgressSchema);
