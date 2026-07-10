/**
 * DSAMantra — Express app
 * Local dev: serves static files + POST /api/teach (Gemini)
 * Vercel: API routes only (static files served by Vercel CDN)
 */

import "./env.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { TeachApiError, resolveApiKey, resolveModel } from "./gemini.js";
import { detectProblemPattern, analyzeSolutionComplexity } from "./problem-ai.js";
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
  extractBearer,
  buildSession,
} from "./auth.js";
import { canAccessProblemAi, canAccessTeachTopic, canAccessTeachTopicById } from "./roadmap-access.js";
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
import { deliverUndeliveredAccessPushes } from "./push-access-delivery.js";
import { listPushDeliveryLogs, getPushDeliveryLogStats } from "./push-delivery-log-db.js";
import { seedPilotLearningFacts } from "./topic-learning-facts-db.js";
import {
  deliverLearningFactToUser,
  previewLearningFactForUser,
} from "./learning-fact-delivery.js";

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
  let keyStatus = "missing";
  try {
    const key = resolveApiKey();
    keyStatus = key ? "configured" : "missing";
  } catch {
    keyStatus = "invalid";
  }

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
    teach: keyStatus === "configured",
    keyStatus,
    provider: "gemini",
    model: resolveModel(),
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

function handleLessonStoreError(res, err) {
  if (err instanceof LessonStoreError) {
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
    const result = await runScheduledPushReminders();
    res.json({ ok: true, result });
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

app.get("/api/learning-facts/anchor", requireAuth, async (req, res) => {
  try {
    const preview = await previewLearningFactForUser(req.auth.sub);
    res.json(preview);
  } catch (err) {
    console.error("[/api/learning-facts/anchor]", err);
    res.status(500).json({ error: { message: "Failed to load learning anchor.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/learning-facts/deliver", requireAdmin, async (req, res) => {
  try {
    const { userId, sendPush = true } = req.body ?? {};
    if (!userId) {
      res.status(400).json({ error: { message: "userId is required.", code: "INVALID_INPUT" } });
      return;
    }

    const result = await deliverLearningFactToUser(userId, { sendPush: Boolean(sendPush) });

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
      userId,
      anchor: result.anchor,
      fact: result.fact,
      notification: result.notification,
      pushDelivery: result.push,
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
    const { accessLevel, expiresAt } = req.body ?? {};
    const result = await patchUserAdmin(userId, { accessLevel, expiresAt });
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

app.post("/api/problem/analyze-complexity", requireAuth, async (req, res) => {
  try {
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessProblemAi(user)) {
      res.status(403).json({
        error: {
          message: "Upgrade to Premium to unlock AI complexity analysis.",
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
    let keyLabel = "GEMINI_API_KEY not set";
    try {
      const key = resolveApiKey();
      keyLabel = `configured (${key.slice(0, 6)}...${key.slice(-4)})`;
    } catch (err) {
      keyLabel = err.message;
    }

    console.log("");
    console.log("  DSAMantra");
    console.log(`  Serving at: http://localhost:${PORT}`);
    console.log(`  API proxy:  POST http://localhost:${PORT}/api/teach`);
    console.log(`  Provider:   Gemini (${resolveModel()})`);
    console.log(`  Gemini API: ${keyLabel}`);
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