/**
 * DSA Mastery Tracker — Express app
 * Local dev: serves static files + POST /api/teach (Gemini)
 * Vercel: API routes only (static files served by Vercel CDN)
 */

import "./env.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { teachTopic, TeachApiError, resolveApiKey, resolveModel } from "./gemini.js";
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
} from "./auth.js";
import { canAccessTeachTopic } from "./roadmap-access.js";
import { connectDB, getMongoStatus, isMongoConnected } from "./db/mongodb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const IS_VERCEL = Boolean(process.env.VERCEL);

const app = express();

app.use(express.json({ limit: "32kb" }));

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[mongodb] Connection failed:", err.message);
    const missingUri = !process.env.MONGODB_URI?.trim();
    const message = missingUri
      ? "MONGODB_URI is not set. Add it to .env (local) or Vercel → Settings → Environment Variables (production), then redeploy."
      : "Database unavailable. Verify MONGODB_URI, MongoDB Atlas network access (allow 0.0.0.0/0 for Vercel), and redeploy.";
    res.status(503).json({
      error: {
        message,
        code: missingUri ? "MONGODB_URI_MISSING" : "DB_UNAVAILABLE",
      },
    });
  }
});

function handleAuthError(res, err) {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};
    const user = await registerUser({ name, email, password });
    res.status(201).json({ user, message: "Registration successful. Awaiting admin approval." });
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
    res.json({ user: result, message: `Action "${action}" completed.` });
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

app.patch("/api/auth/admin/users/:userId", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessLevel, expiresAt } = req.body ?? {};
    const user = await patchUserAdmin(userId, { accessLevel, expiresAt });
    res.json({ user, message: "User updated." });
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

app.post("/api/teach", requireAuth, async (req, res) => {
  try {
    const { topic } = req.body ?? {};
    const token = extractBearer(req);
    const user = await getCurrentUser(token);

    if (!canAccessTeachTopic(user, topic)) {
      res.status(403).json({
        error: {
          message: "Subscribe to unlock the full roadmap and AI lessons.",
          code: "ROADMAP_LOCKED",
        },
      });
      return;
    }

    const result = await teachTopic(topic);
    res.json(result);
  } catch (err) {
    if (err instanceof TeachApiError) {
      res.status(err.status).json({
        error: { message: err.message, code: err.code },
      });
      return;
    }

    console.error("[/api/teach]", err);
    res.status(500).json({
      error: { message: "Internal server error.", code: "SERVER_ERROR" },
    });
  }
});

app.get("/api/health", (_req, res) => {
  let keyStatus = "missing";
  try {
    const key = resolveApiKey();
    keyStatus = key ? "configured" : "missing";
  } catch {
    keyStatus = "invalid";
  }

  res.json({
    ok: true,
    teach: keyStatus === "configured",
    keyStatus,
    provider: "gemini",
    model: resolveModel(),
    userStore: "mongodb-atlas",
    userStorePersistent: isMongoConnected(),
    mongodb: getMongoStatus(),
  });
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
    console.log("  DSA Mastery Tracker");
    console.log(`  Serving at: http://localhost:${PORT}`);
    console.log(`  API proxy:  POST http://localhost:${PORT}/api/teach`);
    console.log(`  Provider:   Gemini (${resolveModel()})`);
    console.log(`  Gemini API: ${keyLabel}`);
    try {
      await connectDB();
      console.log(`  MongoDB:    connected (${getMongoStatus()})`);
    } catch (err) {
      console.log(`  MongoDB:    ${err.message}`);
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