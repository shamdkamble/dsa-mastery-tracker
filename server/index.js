/**
 * DSAMantra — Express app
 * Local dev: serves static files + POST /api/teach (Gemini primary, Groq fallback)
 * Vercel: API routes only (static files served by Vercel CDN)
 */

import "./env.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { TeachApiError, resolveApiKey, resolveModel } from "./gemini.js";
import { isGroqConfigured, resolveGroqModel } from "./groq.js";
import { getSystemArchitectureLiveSnapshot } from "./system-architecture-live.js";
import {
  detectProblemPattern,
  analyzeSolutionComplexity,
  analyzeSolutionSuggestions,
  estimateIdealSolveTime,
  validateSolutionCode,
} from "./problem-ai.js";
import { fetchLeetcodeProblem, LeetcodeApiError, parseLeetcodeSlug } from "./leetcode.js";
import {
  AuthError,
  registerUser,
  loginUser,
  getCurrentUser,
  listPendingUsers,
  listAllUsers,
  adminUserAction,
  patchUserAdmin,
  requireAuth,
  requireAdmin,
  requireTesterOrAdmin,
  requireTester,
  extractBearer,
  buildSession,
} from "./auth.js";
import {
  TestIssueError,
  listTestIssues,
  getTestIssueStats,
  createTestIssue,
  updateTestIssue,
  clearAllTestIssues,
} from "./test-issues-store.js";
import {
  MentorChatError,
  getStudentThreadView,
  sendStudentMessage,
  listAdminThreads,
  getAdminThreadView,
  getAdminStudentThreadView,
  sendAdminMessage,
  sendAdminMessageToStudent,
  getAdminInboxStats,
} from "./mentor-chat-store.js";
import {
  canAccessProblemAi,
  canAccessSolveCompletionAi,
  canAccessTeachTopic,
  canAccessTeachTopicById,
} from "./roadmap-access.js";
import { sendAdminManualNotifications } from "./admin-manual-notifications.js";
import {
  TopicVideoError,
  getTopicVideo,
  listTopicVideosAdmin,
  upsertTopicVideo,
} from "./topic-video-store.js";
import {
  LessonStoreError,
  getCachedLesson,
  getOrCreateStandardLesson,
  getOrCreateSimplerLesson,
  getUserRoadmapProgress,
  markTopicComplete,
} from "./lesson-store.js";
import {
  UserDataError,
  getUserData,
  createProblem as createProblemRecord,
  updateProblemRecord,
  deleteProblemRecord,
  createActivity as createActivityRecord,
  migrateUserData,
  clearUserStudyData,
  listUserDataArchives,
  restoreUserStudyData,
  acknowledgeLocalRestore,
} from "./user-data-store.js";
import {
  connectDB,
  formatMongoError,
  getLastMongoError,
  getMongoDiagnostics,
  getMongoStatus,
  getMongoUri,
  initDatabase,
  isMongoConnected,
} from "./db/mongodb.js";
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from "./notifications-db.js";
import {
  deleteAllPushSubscriptionsForUser,
  deletePushSubscription,
  hasPushSubscription,
  upsertPushSubscription,
} from "./push-subscriptions-db.js";
import { getVapidPublicKey, isPushConfigured, sendTestPushToUser } from "./push-service.js";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "./notification-preferences-db.js";
import { runScheduledPushReminders } from "./push-reminders.js";
import { runDailyWisdomDelivery } from "./learning-wisdom-daily.js";
import { deliverUndeliveredAccessPushes } from "./push-access-delivery.js";
import { listPushDeliveryLogs, getPushDeliveryLogStats } from "./push-delivery-log-db.js";
import { seedPilotLearningFacts } from "./topic-learning-facts-db.js";
import {
  generateFactsBatch,
  generateFactsForTopic,
  getLearningFactsPoolStats,
} from "./learning-fact-generator.js";
import {
  deliverLearningFactToUser,
  previewLearningFactForUser,
} from "./learning-fact-delivery.js";
import { getDailyWisdomAdminDashboard } from "./daily-wisdom-admin-stats.js";
import {
  MediaStorageError,
  uploadProfilePhotoForUser,
  removeProfilePhotoForUser,
  uploadChatImageForUser,
} from "./media-routes.js";
import { getR2ConfigDiagnostics } from "./r2-storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const IS_VERCEL = Boolean(process.env.VERCEL);

const app = express();

app.use(express.json({ limit: "128kb" }));

function sendDbError(res, err) {
  const details = formatMongoError(err);
  const missingUri = !getMongoUri();
  res.status(503).json({
    error: {
      message: missingUri
        ? details.message
        : `Database unavailable: ${details.message}`,
      code: missingUri ? "MONGODB_URI_MISSING" : "DB_UNAVAILABLE",
      mongo: details,
    },
  });
}

app.get("/api/health", async (_req, res) => {
  let geminiStatus = "missing";
  try {
    const key = resolveApiKey();
    geminiStatus = key ? "configured" : "missing";
  } catch {
    geminiStatus = "missing";
  }

  const groqStatus = isGroqConfigured() ? "configured" : "missing";
  const aiReady = geminiStatus === "configured" || groqStatus === "configured";

  let dbOk = false;
  let dbError = null;

  try {
    await connectDB();
    dbOk = isMongoConnected();
  } catch (err) {
    dbError = formatMongoError(err);
    console.error("[/api/health] MongoDB check failed:", dbError.message);
  }

  const diagnostics = getMongoDiagnostics();

  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    teach: aiReady,
    keyStatus: geminiStatus,
    provider: geminiStatus === "configured" ? "gemini" : (groqStatus === "configured" ? "groq" : "none"),
    model: resolveModel(),
    gemini: { status: geminiStatus, model: resolveModel() },
    groq: { status: groqStatus, model: resolveGroqModel() },
    userStore: "mongodb-atlas",
    problemStore: dbOk ? "mongodb-atlas" : "unavailable",
    userStorePersistent: dbOk,
    mongodb: diagnostics.status,
    mongo: {
      connected: dbOk,
      database: diagnostics.database,
      host: diagnostics.host,
      configured: diagnostics.configured,
      uriPreview: diagnostics.uriPreview,
      error: dbError || diagnostics.lastError,
    },
  });
});

app.use("/api", async (req, res, next) => {
  if (req.path === "/health" || req.path.startsWith("/leetcode/")) {
    next();
    return;
  }

  try {
    await connectDB();
    next();
  } catch (err) {
    sendDbError(res, err);
  }
});

app.get("/api/leetcode/problem", async (req, res) => {
  try {
    const slug = parseLeetcodeSlug(req.query.slug || req.query.url || "");
    if (!slug) {
      res.status(400).json({
        error: {
          message: "Invalid LeetCode URL or slug.",
          code: "INVALID_INPUT",
        },
      });
      return;
    }

    const result = await fetchLeetcodeProblem(slug);
    res.json(result);
  } catch (err) {
    if (err instanceof LeetcodeApiError) {
      res.status(err.status).json({ error: { message: err.message, code: err.code } });
      return;
    }
    console.error("[/api/leetcode/problem]", err);
    res.status(500).json({
      error: { message: "LeetCode lookup failed.", code: "SERVER_ERROR" },
    });
  }
});

// Eager database connection when the serverless function / process loads
initDatabase();

function handleAuthError(res, err) {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

function handleUserDataError(res, err) {
  if (err instanceof UserDataError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

function handleTestIssueError(res, err) {
  if (err instanceof TestIssueError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

function handleMentorChatError(res, err) {
  if (err instanceof MentorChatError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

function handleMediaStorageError(res, err) {
  if (err instanceof MediaStorageError) {
    res.status(err.status).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return true;
  }
  return false;
}

const imageUploadParser = express.raw({
  type: ["image/jpeg", "image/png", "image/webp"],
  limit: 220 * 1024,
});

function handleLessonStoreError(res, err) {
  if (err instanceof LessonStoreError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

function handleTopicVideoError(res, err) {
  if (err instanceof TopicVideoError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};
    const user = await registerUser({ name, email, password });
    const session = buildSession(user);
    res.status(201).json({
      ...session,
      message: "Registration successful. Enable notifications to get alerted when approved.",
    });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/auth/register]", err);
    res.status(500).json({ error: { message: "Registration failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body ?? {};
    const result = await loginUser({
      identifier: identifier || email || username,
      password,
    });
    res.json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/auth/login]", err);
    res.status(500).json({ error: { message: "Login failed.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);
    res.json({ user });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    res.status(401).json({ error: { message: "Unauthorized.", code: "UNAUTHORIZED" } });
  }
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await listUserNotifications(req.auth.sub);
    res.json({ notifications });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/notifications]", err);
    res.status(500).json({ error: { message: "Failed to load notifications.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/notifications/:notificationId/read", requireAuth, async (req, res) => {
  try {
    const notification = await markUserNotificationRead(req.auth.sub, req.params.notificationId);
    if (!notification) {
      res.status(404).json({ error: { message: "Notification not found.", code: "NOT_FOUND" } });
      return;
    }
    res.json({ notification });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/notifications/read]", err);
    res.status(500).json({ error: { message: "Failed to update notification.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await markAllUserNotificationsRead(req.auth.sub);
    res.json({ ok: true });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/notifications/read-all]", err);
    res.status(500).json({ error: { message: "Failed to update notifications.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/push/config", (_req, res) => {
  res.json({
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
});

app.get("/api/push/status", requireAuth, async (req, res) => {
  try {
    const subscribed = await hasPushSubscription(req.auth.sub);
    res.json({
      configured: isPushConfigured(),
      subscribed,
    });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/push/status]", err);
    res.status(500).json({ error: { message: "Failed to load push status.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
  try {
    if (!isPushConfigured()) {
      res.status(503).json({
        error: { message: "Push notifications are not configured on the server.", code: "PUSH_NOT_CONFIGURED" },
      });
      return;
    }

    const subscription = req.body?.subscription || req.body;
    const record = await upsertPushSubscription(
      req.auth.sub,
      subscription,
      req.headers["user-agent"] || "",
    );

    if (!record) {
      res.status(400).json({ error: { message: "Invalid push subscription.", code: "INVALID_SUBSCRIPTION" } });
      return;
    }

    const delivery = await deliverUndeliveredAccessPushes(req.auth.sub);

    res.json({ ok: true, subscription: record, delivery });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/push/subscribe]", err);
    res.status(500).json({ error: { message: "Failed to save push subscription.", code: "SERVER_ERROR" } });
  }
});

app.delete("/api/push/unsubscribe", requireAuth, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;

    if (endpoint) {
      await deletePushSubscription(req.auth.sub, endpoint);
    } else {
      await deleteAllPushSubscriptionsForUser(req.auth.sub);
    }

    res.json({ ok: true });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/push/unsubscribe]", err);
    res.status(500).json({ error: { message: "Failed to remove push subscription.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/push/deliver-unread", requireAuth, async (req, res) => {
  try {
    if (!isPushConfigured()) {
      res.status(503).json({
        error: { message: "Push notifications are not configured on the server.", code: "PUSH_NOT_CONFIGURED" },
      });
      return;
    }

    const subscribed = await hasPushSubscription(req.auth.sub);
    if (!subscribed) {
      res.status(400).json({
        error: {
          message: "Enable system notifications first.",
          code: "NOT_SUBSCRIBED",
        },
      });
      return;
    }

    const result = await deliverUndeliveredAccessPushes(req.auth.sub);
    res.json({ ok: true, result });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/push/deliver-unread]", err);
    res.status(500).json({ error: { message: "Failed to deliver notifications.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/push/test", requireAuth, async (req, res) => {
  try {
    if (!isPushConfigured()) {
      res.status(503).json({
        error: { message: "Push notifications are not configured on the server.", code: "PUSH_NOT_CONFIGURED" },
      });
      return;
    }

    const subscribed = await hasPushSubscription(req.auth.sub);
    if (!subscribed) {
      res.status(400).json({
        error: {
          message: "No push subscription found for this account on this device. Enable push notifications first.",
          code: "NOT_SUBSCRIBED",
        },
      });
      return;
    }

    const result = await sendTestPushToUser(req.auth.sub);
    res.json({ ok: true, result });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/push/test]", err);
    res.status(500).json({ error: { message: "Failed to send test notification.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/push/preferences", requireAuth, async (req, res) => {
  try {
    const preferences = await getNotificationPreferences(req.auth.sub);
    res.json({ preferences });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/push/preferences]", err);
    res.status(500).json({ error: { message: "Failed to load notification preferences.", code: "SERVER_ERROR" } });
  }
});

app.patch("/api/push/preferences", requireAuth, async (req, res) => {
  try {
    const preferences = await upsertNotificationPreferences(req.auth.sub, req.body?.preferences || req.body || {});
    res.json({ ok: true, preferences });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/push/preferences]", err);
    res.status(500).json({ error: { message: "Failed to save notification preferences.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/cron/push-reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";

  if (!secret || auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: { message: "Unauthorized.", code: "UNAUTHORIZED" } });
    return;
  }

  try {
    const [reminders, dailyWisdom] = await Promise.all([
      runScheduledPushReminders(),
      runDailyWisdomDelivery(),
    ]);
    res.json({ ok: true, reminders, dailyWisdom });
  } catch (err) {
    console.error("[/api/cron/push-reminders]", err);
    res.status(500).json({ error: { message: "Cron job failed.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/pending", requireAdmin, async (_req, res) => {
  try {
    const users = await listPendingUsers();
    res.json({ users });
  } catch (err) {
    console.error("[/api/auth/admin/pending]", err);
    res.status(500).json({ error: { message: "Failed to load users.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/users", requireAdmin, async (_req, res) => {
  try {
    const users = await listAllUsers();
    res.json({ users });
  } catch (err) {
    console.error("[/api/auth/admin/users]", err);
    res.status(500).json({ error: { message: "Failed to load users.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/action", requireAdmin, async (req, res) => {
  try {
    const { userId, action } = req.body ?? {};
    if (!userId || !action) {
      res.status(400).json({ error: { message: "userId and action are required.", code: "INVALID_INPUT" } });
      return;
    }
    const result = await adminUserAction(userId, action);
    res.json({
      user: result.user,
      pushDelivery: result.pushDelivery ?? null,
      message: `Action "${action}" completed.`,
    });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (err.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: { message: "User not found.", code: "NOT_FOUND" } });
      return;
    }
    console.error("[/api/auth/admin/action]", err);
    res.status(500).json({ error: { message: "Action failed.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/push-logs", requireAdmin, async (req, res) => {
  try {
    const {
      limit,
      status,
      source,
      userId,
      search,
    } = req.query ?? {};

    const [logs, stats] = await Promise.all([
      listPushDeliveryLogs({
        limit: limit ? Number.parseInt(limit, 10) : 100,
        status: status || "all",
        source: source || "all",
        userId: userId || undefined,
        search: search || undefined,
      }),
      getPushDeliveryLogStats(),
    ]);

    res.json({ logs, stats });
  } catch (err) {
    console.error("[/api/auth/admin/push-logs]", err);
    res.status(500).json({ error: { message: "Failed to load push logs.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/learning-facts/seed", requireAdmin, async (_req, res) => {
  try {
    const result = await seedPilotLearningFacts();
    res.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/auth/admin/learning-facts/seed]", err);
    res.status(500).json({ error: { message: "Failed to seed learning facts.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/cron/daily-wisdom", requireAdmin, async (req, res) => {
  try {
    const { force = true, skipTimezone = true, userId } = req.body ?? {};
    const result = await runDailyWisdomDelivery({
      force: force !== false,
      skipTimezone: skipTimezone !== false,
      userId: userId || null,
    });
    res.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/auth/admin/cron/daily-wisdom]", err);
    res.status(500).json({ error: { message: "Daily Wisdom cron failed.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/learning-facts/stats", requireAdmin, async (_req, res) => {
  try {
    const stats = await getLearningFactsPoolStats();
    res.json({ stats });
  } catch (err) {
    console.error("[/api/auth/admin/learning-facts/stats]", err);
    res.status(500).json({ error: { message: "Failed to load Mantra Feed stats.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/learning-facts/dashboard", requireAdmin, async (req, res) => {
  try {
    const dashboard = await getDailyWisdomAdminDashboard(req.auth.sub);
    res.json({ dashboard });
  } catch (err) {
    console.error("[/api/auth/admin/learning-facts/dashboard]", err);
    res.status(500).json({ error: { message: "Failed to load Daily Wisdom dashboard.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/system-architecture", requireAdmin, async (_req, res) => {
  try {
    const snapshot = await getSystemArchitectureLiveSnapshot();
    res.json({ snapshot });
  } catch (err) {
    console.error("[/api/auth/admin/system-architecture]", err);
    res.status(500).json({ error: { message: "Failed to load architecture snapshot.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/learning-facts/generate-batch", requireAdmin, async (req, res) => {
  try {
    const { topicsPerCall, limit, replaceExisting = false, useGeminiFallback = false } = req.body ?? {};
    const perCall = Number.parseInt(topicsPerCall ?? limit, 10) || 18;
    const result = await generateFactsBatch({
      topicsPerCall: Math.min(Math.max(perCall, 1), 20),
      replaceExisting: replaceExisting === true,
      useGeminiFallback: useGeminiFallback === true,
    });
    res.json({
      ok: !result.needsGeminiFallback,
      needsGeminiFallback: Boolean(result.needsGeminiFallback),
      groqError: result.groqError || null,
      result,
    });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/auth/admin/learning-facts/generate-batch]", err);
    const status = err?.status || 500;
    res.status(status).json({
      error: { message: err?.message || "Batch generation failed.", code: err?.code || "SERVER_ERROR" },
    });
  }
});

app.post("/api/auth/admin/learning-facts/generate/:topicId", requireAdmin, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { replaceExisting = true } = req.body ?? {};
    const result = await generateFactsForTopic(topicId, { replaceExisting: replaceExisting !== false });
    res.json({ ok: true, result });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/auth/admin/learning-facts/generate/:topicId]", err);
    const status = err?.status || 500;
    res.status(status).json({
      error: { message: err?.message || "Generation failed.", code: err?.code || "SERVER_ERROR" },
    });
  }
});

app.get("/api/learning-facts/anchor", requireAuth, async (req, res) => {
  try {
    const preview = await previewLearningFactForUser(req.auth.sub);
    res.json(preview);
  } catch (err) {
    console.error("[/api/learning-facts/anchor]", err);
    res.status(500).json({ error: { message: "Failed to load learning anchor.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/notifications/send", requireAdmin, async (req, res) => {
  try {
    const {
      userIds,
      title,
      text,
      variant,
      href,
      sendPush = true,
    } = req.body ?? {};

    const result = await sendAdminManualNotifications(userIds, {
      title,
      text,
      variant,
      href,
      sendPush: Boolean(sendPush),
    });

    if (!result.ok) {
      res.status(400).json({
        error: { message: result.message, code: result.code || "INVALID_INPUT" },
      });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error("[/api/auth/admin/notifications/send]", err);
    res.status(500).json({ error: { message: "Failed to send notifications.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/learning-facts/deliver", requireAdmin, async (req, res) => {
  try {
    const { userId, userIds, sendPush = true } = req.body ?? {};
    const targets = Array.isArray(userIds) && userIds.length
      ? userIds
      : (userId ? [userId] : []);

    if (!targets.length) {
      res.status(400).json({ error: { message: "Select at least one user.", code: "INVALID_INPUT" } });
      return;
    }

    if (targets.length === 1) {
      const result = await deliverLearningFactToUser(targets[0], { sendPush: Boolean(sendPush) });

      if (!result.ok) {
        res.status(409).json({
          ok: false,
          reason: result.reason,
          anchor: result.anchor,
          fact: result.fact,
        });
        return;
      }

      res.json({
        ok: true,
        userId: targets[0],
        anchor: result.anchor,
        fact: result.fact,
        message: result.message,
        notification: result.notification,
        pushDelivery: result.push,
      });
      return;
    }

    const results = [];
    for (const uid of targets) {
      const result = await deliverLearningFactToUser(uid, { sendPush: Boolean(sendPush) });
      results.push({ userId: uid, ...result });
    }

    const sent = results.filter((r) => r.ok).length;
    res.json({
      ok: true,
      total: targets.length,
      sent,
      failed: targets.length - sent,
      results,
    });
  } catch (err) {
    console.error("[/api/auth/admin/learning-facts/deliver]", err);
    res.status(500).json({ error: { message: "Failed to deliver learning fact.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/learning-facts/deliver-next", requireAuth, async (req, res) => {
  try {
    const { sendPush = true } = req.body ?? {};
    const result = await deliverLearningFactToUser(req.auth.sub, { sendPush: Boolean(sendPush) });

    if (!result.ok) {
      res.status(409).json({
        ok: false,
        reason: result.reason,
        anchor: result.anchor,
        fact: result.fact,
      });
      return;
    }

    res.json({
      ok: true,
      anchor: result.anchor,
      fact: result.fact,
      message: result.message,
      notification: result.notification,
      pushDelivery: result.push,
    });
  } catch (err) {
    console.error("[/api/learning-facts/deliver-next]", err);
    res.status(500).json({ error: { message: "Failed to deliver learning fact.", code: "SERVER_ERROR" } });
  }
});

app.patch("/api/auth/admin/users/:userId", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessLevel, expiresAt, role } = req.body ?? {};
    const result = await patchUserAdmin(userId, { accessLevel, expiresAt, role });
    res.json({
      user: result.user,
      pushDelivery: result.pushDelivery ?? null,
      message: "User updated.",
    });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (err.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: { message: "User not found.", code: "NOT_FOUND" } });
      return;
    }
    console.error("[/api/auth/admin/users/:userId]", err);
    res.status(500).json({ error: { message: "Update failed.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/user-data", requireAuth, async (req, res) => {
  try {
    const data = await getUserData(req.auth.sub);
    res.json(data);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/user-data]", err);
    res.status(500).json({ error: { message: "Failed to load user data.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/user-data/ack-restore", requireAuth, async (req, res) => {
  try {
    const { archiveId } = req.body ?? {};
    const result = await acknowledgeLocalRestore(req.auth.sub, archiveId);
    res.json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/user-data/ack-restore]", err);
    res.status(500).json({ error: { message: "Failed to acknowledge restore.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/user-data/migrate", requireAuth, async (req, res) => {
  try {
    const { problems, activities } = req.body ?? {};
    const result = await migrateUserData(req.auth.sub, { problems, activities });
    res.json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleUserDataError(res, err)) return;
    console.error("[/api/user-data/migrate]", err);
    res.status(500).json({ error: { message: "Migration failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/user-data/clear", requireAuth, async (req, res) => {
  try {
    const { localSnapshot } = req.body ?? {};
    const result = await clearUserStudyData(req.auth.sub, { localSnapshot });
    res.json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleUserDataError(res, err)) return;
    console.error("[/api/user-data/clear]", err);
    res.status(500).json({ error: { message: "Failed to clear study data.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/users/:userId/data-archives", requireAdmin, async (req, res) => {
  try {
    const archives = await listUserDataArchives(req.params.userId);
    res.json({ archives });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/auth/admin/users/:userId/data-archives]", err);
    res.status(500).json({ error: { message: "Failed to load archives.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/users/:userId/restore-data", requireAdmin, async (req, res) => {
  try {
    const { archiveId } = req.body ?? {};
    const result = await restoreUserStudyData(req.params.userId, { archiveId });
    res.json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleUserDataError(res, err)) return;
    console.error("[/api/auth/admin/users/:userId/restore-data]", err);
    res.status(500).json({ error: { message: "Failed to restore study data.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/problems", requireAuth, async (req, res) => {
  try {
    const problem = await createProblemRecord(req.auth.sub, req.body ?? {});
    res.status(201).json({ problem });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleUserDataError(res, err)) return;
    console.error("[/api/problems]", err);
    res.status(500).json({ error: { message: "Failed to create problem.", code: "SERVER_ERROR" } });
  }
});

app.patch("/api/problems/:id", requireAuth, async (req, res) => {
  try {
    const problem = await updateProblemRecord(req.auth.sub, req.params.id, req.body ?? {});
    res.json({ problem });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleUserDataError(res, err)) return;
    console.error("[/api/problems/:id]", err);
    res.status(500).json({ error: { message: "Failed to update problem.", code: "SERVER_ERROR" } });
  }
});

app.delete("/api/problems/:id", requireAuth, async (req, res) => {
  try {
    await deleteProblemRecord(req.auth.sub, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleUserDataError(res, err)) return;
    console.error("[/api/problems/:id]", err);
    res.status(500).json({ error: { message: "Failed to delete problem.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/activities", requireAuth, async (req, res) => {
  try {
    const activity = await createActivityRecord(req.auth.sub, req.body ?? {});
    res.status(201).json({ activity });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleUserDataError(res, err)) return;
    console.error("[/api/activities]", err);
    res.status(500).json({ error: { message: "Failed to log activity.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/test-issues", requireTesterOrAdmin, async (_req, res) => {
  try {
    const issues = await listTestIssues();
    res.json({ issues });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleTestIssueError(res, err)) return;
    console.error("[/api/test-issues]", err);
    res.status(500).json({ error: { message: "Failed to load test issues.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/test-issues/stats", requireTesterOrAdmin, async (_req, res) => {
  try {
    const stats = await getTestIssueStats();
    res.json({ stats });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleTestIssueError(res, err)) return;
    console.error("[/api/test-issues/stats]", err);
    res.status(500).json({ error: { message: "Failed to load issue stats.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/test-issues", requireTester, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const issue = await createTestIssue(user, req.body ?? {});
    res.status(201).json({ issue });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleTestIssueError(res, err)) return;
    console.error("[/api/test-issues]", err);
    res.status(500).json({ error: { message: "Failed to create test issue.", code: "SERVER_ERROR" } });
  }
});

app.patch("/api/test-issues/:id", requireTesterOrAdmin, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const issue = await updateTestIssue(user, req.params.id, req.body ?? {});
    res.json({ issue });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleTestIssueError(res, err)) return;
    console.error("[/api/test-issues/:id]", err);
    res.status(500).json({ error: { message: "Failed to update test issue.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/test-issues/clear", requireAdmin, async (_req, res) => {
  try {
    const { deletedCount } = await clearAllTestIssues();
    res.json({ deletedCount });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleTestIssueError(res, err)) return;
    console.error("[/api/auth/admin/test-issues/clear]", err);
    res.status(500).json({ error: { message: "Failed to clear test issues.", code: "SERVER_ERROR" } });
  }
});

function parseMarkReadQuery(req) {
  const value = req.query?.markRead;
  return value === "1" || value === "true";
}

function parseThreadMessageQuery(req) {
  const { limit, before, after } = req.query || {};
  return {
    markRead: parseMarkReadQuery(req),
    ...(limit != null && limit !== "" ? { limit } : {}),
    ...(before ? { before: String(before) } : {}),
    ...(after ? { after: String(after) } : {}),
  };
}

app.get("/api/mentor-chat/thread", requireAuth, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const data = await getStudentThreadView(user, parseThreadMessageQuery(req));
    res.json(data);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    console.error("[/api/mentor-chat/thread]", err);
    res.status(500).json({ error: { message: "Failed to load conversation.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/media/status", requireAuth, (_req, res) => {
  res.json(getR2ConfigDiagnostics());
});

app.post("/api/media/profile-photo", requireAuth, imageUploadParser, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const result = await uploadProfilePhotoForUser(user, req.body, req.headers["content-type"]);
    res.status(201).json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMediaStorageError(res, err)) return;
    console.error("[/api/media/profile-photo]", err);
    res.status(500).json({ error: { message: "Failed to upload profile photo.", code: "SERVER_ERROR" } });
  }
});

app.delete("/api/media/profile-photo", requireAuth, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    await removeProfilePhotoForUser(user, req.body?.currentUrl);
    res.json({ ok: true });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMediaStorageError(res, err)) return;
    console.error("[DELETE /api/media/profile-photo]", err);
    res.status(500).json({ error: { message: "Failed to remove profile photo.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/media/chat-image", requireAuth, imageUploadParser, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const threadId = String(req.headers["x-thread-id"] || req.query?.threadId || "").trim();
    const studentId = String(req.headers["x-student-id"] || req.query?.studentId || "").trim();
    const result = await uploadChatImageForUser(user, { threadId, studentId }, req.body, req.headers["content-type"]);
    res.status(201).json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    if (handleMediaStorageError(res, err)) return;
    console.error("[/api/media/chat-image]", err);
    res.status(500).json({ error: { message: "Failed to upload chat image.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/mentor-chat/messages", requireAuth, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const message = await sendStudentMessage(user, {
      body: req.body?.body,
      imageUrl: req.body?.imageUrl,
    }, req.body?.replyToId);
    res.status(201).json({ message });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    console.error("[/api/mentor-chat/messages]", err);
    res.status(500).json({ error: { message: "Failed to send message.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/mentor-chat/threads", requireAdmin, async (_req, res) => {
  try {
    const [threads, stats] = await Promise.all([
      listAdminThreads(),
      getAdminInboxStats(),
    ]);
    res.json({ threads, stats });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    console.error("[/api/auth/admin/mentor-chat/threads]", err);
    res.status(500).json({ error: { message: "Failed to load inbox.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/mentor-chat/threads/:threadId", requireAdmin, async (req, res) => {
  try {
    const data = await getAdminThreadView(req.params.threadId, parseThreadMessageQuery(req));
    res.json(data);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    console.error("[/api/auth/admin/mentor-chat/threads/:threadId]", err);
    res.status(500).json({ error: { message: "Failed to load conversation.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/mentor-chat/students/:studentId", requireAdmin, async (req, res) => {
  try {
    const data = await getAdminStudentThreadView(req.params.studentId, parseThreadMessageQuery(req));
    res.json(data);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    console.error("[/api/auth/admin/mentor-chat/students/:studentId]", err);
    res.status(500).json({ error: { message: "Failed to load student conversation.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/mentor-chat/students/:studentId/messages", requireAdmin, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const message = await sendAdminMessageToStudent(user, req.params.studentId, {
      body: req.body?.body,
      imageUrl: req.body?.imageUrl,
    }, req.body?.replyToId);
    res.status(201).json({ message });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    console.error("[/api/auth/admin/mentor-chat/students/:studentId/messages]", err);
    res.status(500).json({ error: { message: "Failed to send message.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/mentor-chat/threads/:threadId/messages", requireAdmin, async (req, res) => {
  try {
    const user = await getCurrentUser(extractBearer(req));
    const message = await sendAdminMessage(user, req.params.threadId, {
      body: req.body?.body,
      imageUrl: req.body?.imageUrl,
    }, req.body?.replyToId);
    res.status(201).json({ message });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleMentorChatError(res, err)) return;
    console.error("[/api/auth/admin/mentor-chat/threads/:threadId/messages]", err);
    res.status(500).json({ error: { message: "Failed to send message.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/problem/detect-pattern", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessProblemAi(user)) {
      res.status(403).json({
        error: {
          message: "Upgrade to Premium to unlock AI pattern detection.",
          code: "AI_LOCKED",
        },
      });
      return;
    }

    const { title, difficulty, topic, topicTags } = req.body ?? {};
    const result = await detectProblemPattern({ title, difficulty, topic, topicTags });
    res.json(result);
  } catch (err) {
    if (err instanceof TeachApiError) {
      res.status(err.status).json({ error: { message: err.message, code: err.code } });
      return;
    }
    console.error("[/api/problem/detect-pattern]", err);
    res.status(500).json({ error: { message: "Pattern detection failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/problem/validate-solution-code", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessProblemAi(user) && !canAccessSolveCompletionAi(user)) {
      res.status(403).json({
        error: {
          message: "Sign in to validate solution code.",
          code: "AI_LOCKED",
        },
      });
      return;
    }

    const { code } = req.body ?? {};
    const result = await validateSolutionCode({ code });
    res.json(result);
  } catch (err) {
    if (err instanceof TeachApiError) {
      res.status(err.status).json({ error: { message: err.message, code: err.code } });
      return;
    }
    console.error("[/api/problem/validate-solution-code]", err);
    res.status(500).json({ error: { message: "Code validation failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/problem/analyze-complexity", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessProblemAi(user) && !canAccessSolveCompletionAi(user)) {
      res.status(403).json({
        error: {
          message: "Sign in to analyze solution complexity.",
          code: "AI_LOCKED",
        },
      });
      return;
    }

    const { code, title } = req.body ?? {};
    const result = await analyzeSolutionComplexity({ code, title });
    res.json(result);
  } catch (err) {
    if (err instanceof TeachApiError) {
      res.status(err.status).json({ error: { message: err.message, code: err.code } });
      return;
    }
    console.error("[/api/problem/analyze-complexity]", err);
    res.status(500).json({ error: { message: "Complexity analysis failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/problem/estimate-ideal-time", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessSolveCompletionAi(user)) {
      res.status(403).json({
        error: {
          message: "Sign in to estimate ideal solve time.",
          code: "AI_LOCKED",
        },
      });
      return;
    }

    const { title, difficulty, topic, topicTags } = req.body ?? {};
    const result = await estimateIdealSolveTime({ title, difficulty, topic, topicTags });
    res.json(result);
  } catch (err) {
    if (err instanceof TeachApiError) {
      res.status(err.status).json({ error: { message: err.message, code: err.code } });
      return;
    }
    console.error("[/api/problem/estimate-ideal-time]", err);
    res.status(500).json({ error: { message: "Ideal time estimation failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/problem/analyze-suggestions", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessSolveCompletionAi(user)) {
      res.status(403).json({
        error: {
          message: "Sign in to get solution suggestions.",
          code: "AI_LOCKED",
        },
      });
      return;
    }

    const { code, title, timeComplexity, spaceComplexity } = req.body ?? {};
    const result = await analyzeSolutionSuggestions({ code, title, timeComplexity, spaceComplexity });
    res.json(result);
  } catch (err) {
    if (err instanceof TeachApiError) {
      res.status(err.status).json({ error: { message: err.message, code: err.code } });
      return;
    }
    console.error("[/api/problem/analyze-suggestions]", err);
    res.status(500).json({ error: { message: "Suggestion analysis failed.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/teach/video/:topicId", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessTeachTopicById(user, req.params.topicId)) {
      res.status(403).json({
        error: {
          message: "Subscribe to unlock learning content for this topic.",
          code: "ROADMAP_LOCKED",
        },
      });
      return;
    }

    const video = await getTopicVideo(req.params.topicId);
    res.json(video);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/teach/video/:topicId]", err);
    res.status(500).json({ error: { message: "Failed to load topic video.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/auth/admin/topic-videos", requireAdmin, async (_req, res) => {
  try {
    const data = await listTopicVideosAdmin();
    res.json(data);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    console.error("[/api/auth/admin/topic-videos]", err);
    res.status(500).json({ error: { message: "Failed to load topic videos.", code: "SERVER_ERROR" } });
  }
});

app.put("/api/auth/admin/topic-videos/:topicId", requireAdmin, async (req, res) => {
  try {
    const { youtubeUrl, title } = req.body ?? {};
    const result = await upsertTopicVideo(req.params.topicId, {
      youtubeUrl,
      title,
      updatedBy: req.auth.sub,
    });
    res.json(result);
  } catch (err) {
    if (handleAuthError(res, err)) return;
    if (handleTopicVideoError(res, err)) return;
    console.error("[/api/auth/admin/topic-videos/:topicId]", err);
    res.status(500).json({ error: { message: "Failed to save topic video.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/teach/lesson/:topicId", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessTeachTopicById(user, req.params.topicId)) {
      res.status(403).json({
        error: {
          message: "Subscribe to unlock AI lessons for this topic.",
          code: "ROADMAP_LOCKED",
        },
      });
      return;
    }

    const lesson = await getCachedLesson(req.params.topicId);
    if (!lesson) {
      res.status(404).json({ error: { message: "Lesson not cached yet.", code: "NOT_FOUND" } });
      return;
    }
    res.json({
      topicId: lesson.topicId,
      standard: lesson.standard?.content ? lesson.standard : null,
      simpler: lesson.simpler?.content ? lesson.simpler : null,
      cached: true,
    });
  } catch (err) {
    console.error("[/api/teach/lesson/:topicId]", err);
    res.status(500).json({ error: { message: "Failed to load lesson.", code: "SERVER_ERROR" } });
  }
});

app.get("/api/roadmap/progress", requireAuth, async (req, res) => {
  try {
    const progress = await getUserRoadmapProgress(req.auth.sub);
    res.json(progress);
  } catch (err) {
    console.error("[/api/roadmap/progress]", err);
    res.status(500).json({ error: { message: "Failed to load progress.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/roadmap/progress/complete", requireAuth, async (req, res) => {
  try {
    const { topicId } = req.body ?? {};
    if (!topicId) {
      res.status(400).json({ error: { message: "topicId is required.", code: "INVALID_INPUT" } });
      return;
    }
    const progress = await markTopicComplete(req.auth.sub, topicId);
    res.json({ progress, topicId, completed: true });
  } catch (err) {
    if (handleLessonStoreError(res, err)) return;
    console.error("[/api/roadmap/progress/complete]", err);
    res.status(500).json({ error: { message: "Failed to update progress.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/teach", requireAuth, async (req, res) => {
  try {
    const { topic, variant = "standard" } = req.body ?? {};
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessTeachTopic(user, topic, variant)) {
      res.status(403).json({
        error: {
          message: variant === "simpler"
            ? "Upgrade to Premium to unlock simpler explanations from Step 3 onward."
            : "Subscribe to unlock the full roadmap and AI lessons.",
          code: "ROADMAP_LOCKED",
        },
      });
      return;
    }

    const result = variant === "simpler"
      ? await getOrCreateSimplerLesson(topic)
      : await getOrCreateStandardLesson(topic);

    res.json({
      content: result.content,
      simplerContent: result.simplerContent || null,
      model: result.model,
      usage: result.usage,
      cached: result.cached,
      hasSimpler: result.hasSimpler,
      variant,
      topicId: result.topicId || topic?.id,
    });
  } catch (err) {
    if (err instanceof TeachApiError) {
      res.status(err.status).json({
        error: { message: err.message, code: err.code },
      });
      return;
    }
    if (handleLessonStoreError(res, err)) return;

    console.error("[/api/teach]", err);
    res.status(500).json({
      error: { message: "Internal server error.", code: "SERVER_ERROR" },
    });
  }
});

if (!IS_VERCEL) {
  app.use(express.static(ROOT));

  app.use((_req, res) => {
    res.sendFile(path.join(ROOT, "index.html"));
  });
}

export default app;

const isMainModule = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (!IS_VERCEL && isMainModule) {
  const server = app.listen(PORT, async () => {
    let geminiLabel = "not set";
    try {
      const key = resolveApiKey();
      geminiLabel = `configured (${key.slice(0, 6)}...${key.slice(-4)})`;
    } catch (err) {
      geminiLabel = err.message;
    }

    const groqLabel = isGroqConfigured()
      ? `configured (${resolveGroqModel()})`
      : "not set";

    console.log("");
    console.log("  DSAMantra");
    console.log(`  Serving at: http://localhost:${PORT}`);
    console.log(`  API proxy:  POST http://localhost:${PORT}/api/teach`);
    console.log(`  AI routing: Gemini primary → Groq fallback (hooks: Groq primary)`);
    console.log(`  Gemini:     ${resolveModel()} — ${geminiLabel}`);
    console.log(`  Groq:       ${groqLabel}`);
    try {
      await connectDB();
      const diag = getMongoDiagnostics();
      console.log(`  MongoDB:    connected (${getMongoStatus()}) → ${diag.database} @ ${diag.host}`);
    } catch (err) {
      const details = formatMongoError(err);
      console.log(`  MongoDB:    FAILED — ${details.message}`);
      if (getLastMongoError()) {
        console.log(`  MongoDB:    code=${getLastMongoError().code} name=${getLastMongoError().name}`);
      }
    }
    console.log("  Press Ctrl+C to stop");
    console.log("");
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n  Port ${PORT} is already in use.`);
      console.error("  Run .\\serve.ps1 again (it will stop the old server), or set a different port:");
      console.error('  $env:PORT = 8081; .\\serve.ps1\n');
      process.exit(1);
    }
    throw err;
  });
}