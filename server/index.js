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
  approveUser,
  rejectUser,
  requireAuth,
  requireAdmin,
  extractBearer,
} from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const IS_VERCEL = Boolean(process.env.VERCEL);

const app = express();

app.use(express.json({ limit: "32kb" }));

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

app.get("/api/auth/me", (req, res) => {
  try {
    const token = extractBearer(req);
    const user = getCurrentUser(token);
    res.json({ user });
  } catch (err) {
    if (handleAuthError(res, err)) return;
    res.status(401).json({ error: { message: "Unauthorized.", code: "UNAUTHORIZED" } });
  }
});

app.get("/api/auth/admin/pending", requireAdmin, (_req, res) => {
  res.json({ users: listPendingUsers() });
});

app.post("/api/auth/admin/approve", requireAdmin, (req, res) => {
  try {
    const { userId } = req.body ?? {};
    if (!userId) {
      res.status(400).json({ error: { message: "userId is required.", code: "INVALID_INPUT" } });
      return;
    }
    const user = approveUser(userId);
    res.json({ user, message: "User approved." });
  } catch (err) {
    if (err.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: { message: "User not found.", code: "NOT_FOUND" } });
      return;
    }
    console.error("[/api/auth/admin/approve]", err);
    res.status(500).json({ error: { message: "Approval failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/auth/admin/reject", requireAdmin, (req, res) => {
  try {
    const { userId } = req.body ?? {};
    if (!userId) {
      res.status(400).json({ error: { message: "userId is required.", code: "INVALID_INPUT" } });
      return;
    }
    const user = rejectUser(userId);
    res.json({ user, message: "User rejected." });
  } catch (err) {
    if (err.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: { message: "User not found.", code: "NOT_FOUND" } });
      return;
    }
    console.error("[/api/auth/admin/reject]", err);
    res.status(500).json({ error: { message: "Rejection failed.", code: "SERVER_ERROR" } });
  }
});

app.post("/api/teach", requireAuth, async (req, res) => {
  try {
    const { topic } = req.body ?? {};
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
  const server = app.listen(PORT, () => {
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