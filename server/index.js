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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const IS_VERCEL = Boolean(process.env.VERCEL);

const app = express();

app.use(express.json({ limit: "32kb" }));

app.post("/api/teach", async (req, res) => {
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

if (!IS_VERCEL) {
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