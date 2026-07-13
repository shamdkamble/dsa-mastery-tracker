/**
 * Live system snapshot for the admin architecture page
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, getMongoDiagnostics, isMongoConnected } from "./db/mongodb.js";
import { resolveApiKey, resolveModel } from "./gemini.js";
import { isGroqConfigured, resolveGroqModel } from "./groq.js";
import { isPushConfigured, getVapidPublicKey } from "./push-service.js";
import { User } from "./models/User.js";
import { Lesson } from "./models/Lesson.js";
import { Problem } from "./models/Problem.js";
import { PushSubscription } from "./models/PushSubscription.js";
import { getLearningFactsPoolStats } from "./learning-fact-generator.js";
import { getPushDeliveryStatsForSource } from "./push-delivery-log-db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readCacheVersion() {
  try {
    const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
    const match = sw.match(/CACHE_VERSION\s*=\s*"([^"]+)"/);
    return match?.[1] || "unknown";
  } catch {
    return "unknown";
  }
}

function geminiStatus() {
  try {
    resolveApiKey();
    return "configured";
  } catch {
    return "missing";
  }
}

export async function getSystemArchitectureLiveSnapshot() {
  await connectDB();

  const [
    totalUsers,
    pendingUsers,
    approvedUsers,
    suspendedUsers,
    lessonCount,
    problemCount,
    pushSubCount,
    mantraPool,
    wisdomDelivery30d,
    reminderDelivery30d,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "pending" }),
    User.countDocuments({ status: "approved" }),
    User.countDocuments({ status: "suspended" }),
    Lesson.countDocuments({ "standard.content": { $exists: true, $ne: "" } }),
    Problem.countDocuments(),
    PushSubscription.countDocuments(),
    getLearningFactsPoolStats(),
    getPushDeliveryStatsForSource("learning-fact", { days: 30 }),
    getPushDeliveryStatsForSource("reminder", { days: 30 }),
  ]);

  const mongo = getMongoDiagnostics();
  const topicsCoveredPct = mantraPool.totalTopics > 0
    ? Math.round((mantraPool.topicsWithFacts / mantraPool.totalTopics) * 100)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    platform: {
      host: process.env.VERCEL === "1" ? "vercel" : "local",
      cacheVersion: readCacheVersion(),
      nodeEnv: process.env.NODE_ENV || "development",
    },
    providers: {
      gemini: { status: geminiStatus(), model: resolveModel() },
      groq: { status: isGroqConfigured() ? "configured" : "missing", model: resolveGroqModel() },
      routing: {
        lessons: "Gemini → Groq",
        problemAi: "Gemini → Groq",
        mantraHooks: "Groq → Gemini (admin-approved)",
        futureSmallTasks: "Groq → Gemini",
      },
    },
    database: {
      connected: isMongoConnected(),
      name: mongo.database,
      host: mongo.host,
      status: mongo.status,
    },
    push: {
      vapidConfigured: isPushConfigured(),
      publicKeyPreview: getVapidPublicKey()
        ? `${getVapidPublicKey().slice(0, 8)}…`
        : null,
    },
    cron: {
      path: "/api/cron/push-reminders",
      scheduleUtc: "30 3 * * *",
      description: "Daily Vercel cron (~03:30 UTC) — study reminders, Daily Wisdom, account expiry",
      jobs: [
        "Study reminders (mission, reviews, streak, weekly)",
        "Daily Wisdom delivery",
        "Account expiry notifications",
      ],
    },
    counts: {
      users: { total: totalUsers, pending: pendingUsers, approved: approvedUsers, suspended: suspendedUsers },
      lessonsCached: lessonCount,
      problemsTracked: problemCount,
      pushSubscriptions: pushSubCount,
      mantraFeed: {
        totalTopics: mantraPool.totalTopics,
        topicsWithHooks: mantraPool.topicsWithFacts,
        totalHooks: mantraPool.totalActiveFacts,
        coveragePct: topicsCoveredPct,
        hooksProvider: mantraPool.hooksProviderDefault || "groq",
      },
      delivery30d: {
        dailyWisdom: wisdomDelivery30d,
        studyReminders: reminderDelivery30d,
      },
    },
    clientRoutes: {
      public: ["login", "register"],
      learner: ["dashboard", "mission", "problems", "patterns", "roadmap", "analytics", "calendar", "search", "settings"],
      admin: ["admin", "admin-push-logs", "admin-notifications"],
    },
  };
}