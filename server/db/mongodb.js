/**
 * MongoDB Atlas connection — serverless-safe with detailed diagnostics
 */

import mongoose from "mongoose";

const LOG_PREFIX = "[mongodb]";
const DEFAULT_DB_NAME = "dsa-mastery";

/** @type {{ conn: typeof mongoose | null, promise: Promise<typeof mongoose> | null, lastError: object | null }} */
const globalCache = globalThis.__dsaMongoCache ?? {
  conn: null,
  promise: null,
  lastError: null,
};
globalThis.__dsaMongoCache = globalCache;

/**
 * Read and sanitize MONGODB_URI at runtime (not module load).
 * Strips quotes/newlines often introduced when pasting into Vercel UI.
 */
export function getMongoUri() {
  const raw = process.env.MONGODB_URI;
  if (!raw?.trim()) {
    return null;
  }

  let uri = raw.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(`MONGODB_URI must start with mongodb:// or mongodb+srv:// (got: ${uri.slice(0, 20)}...)`);
  }

  // Ensure a database name is present in the path
  const pathMatch = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/);
  const dbInPath = pathMatch?.[1];
  if (!dbInPath || dbInPath.length === 0) {
    const separator = uri.includes("?") ? "?" : "";
    if (separator) {
      uri = uri.replace("?", `/${DEFAULT_DB_NAME}?`);
    } else {
      uri = `${uri.replace(/\/$/, "")}/${DEFAULT_DB_NAME}`;
    }
  }

  return uri;
}

/** Safe URI for logs — password redacted */
export function getMongoUriForLogs() {
  try {
    const uri = getMongoUri();
    if (!uri) return "(not set)";
    return uri.replace(/:([^:@/]+)@/, ":***@");
  } catch (err) {
    return `(invalid: ${err.message})`;
  }
}

export function formatMongoError(err) {
  if (!err) return { message: "Unknown database error", code: "DB_ERROR" };

  const base = {
    message: err.message || String(err),
    code: err.code || err.name || "DB_ERROR",
    name: err.name,
  };

  if (err.reason?.type) base.reason = err.reason.type;
  if (err.codeName) base.codeName = err.codeName;
  if (err.errorLabels?.length) base.errorLabels = err.errorLabels;

  // Mongoose ServerSelectionError often wraps the real cause
  if (err.cause?.message) base.cause = err.cause.message;

  return base;
}

function logMongoError(phase, err) {
  const details = formatMongoError(err);
  console.error(`${LOG_PREFIX} ${phase} failed:`, details.message);
  console.error(`${LOG_PREFIX} Error name:`, details.name);
  console.error(`${LOG_PREFIX} Error code:`, details.code);
  if (details.codeName) console.error(`${LOG_PREFIX} Code name:`, details.codeName);
  if (details.reason) console.error(`${LOG_PREFIX} Reason:`, details.reason);
  if (details.cause) console.error(`${LOG_PREFIX} Cause:`, details.cause);
  if (err?.stack) console.error(`${LOG_PREFIX} Stack:`, err.stack);
  globalCache.lastError = details;
}

/**
 * Mongoose 8+ — useNewUrlParser / useUnifiedTopology are defaults (do not pass).
 * `family: 4` forces IPv4 — fixes many Vercel → Atlas connection failures.
 */
function getConnectOptions() {
  return {
    maxPoolSize: process.env.VERCEL ? 5 : 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
    family: 4,
    retryWrites: true,
    w: "majority",
  };
}

async function runMigrations() {
  try {
    const { migrateLegacyUsersIfEmpty } = await import("./migrate-legacy-users.js");
    const result = await migrateLegacyUsersIfEmpty();
    if (result.migrated > 0) {
      console.log(`${LOG_PREFIX} Migrated ${result.migrated} legacy user(s)`);
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Legacy migration skipped:`, err.message);
  }
}

/**
 * Connect to MongoDB Atlas. Cached on globalThis for warm Vercel invocations.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  if (globalCache.conn && mongoose.connection.readyState === 1) {
    return globalCache.conn;
  }

  if (mongoose.connection.readyState === 1) {
    globalCache.conn = mongoose;
    return mongoose;
  }

  const uri = getMongoUri();
  if (!uri) {
    const err = new Error(
      "MONGODB_URI is not set. Add it to .env (local) or Vercel → Settings → Environment Variables, then redeploy.",
    );
    err.code = "MONGODB_URI_MISSING";
    throw err;
  }

  if (!globalCache.promise) {
    console.log(`${LOG_PREFIX} Connecting to Atlas...`);
    console.log(`${LOG_PREFIX} URI: ${getMongoUriForLogs()}`);
    console.log(`${LOG_PREFIX} Runtime: ${process.env.VERCEL ? "vercel-serverless" : "node"}`);

    mongoose.set("strictQuery", true);

    globalCache.promise = mongoose
      .connect(uri, getConnectOptions())
      .then(async (conn) => {
        globalCache.lastError = null;
        console.log(`${LOG_PREFIX} Connected successfully`);
        console.log(`${LOG_PREFIX} Database: ${mongoose.connection.name}`);
        console.log(`${LOG_PREFIX} Host: ${mongoose.connection.host}`);
        await runMigrations();
        globalCache.conn = conn;
        return conn;
      })
      .catch((err) => {
        globalCache.promise = null;
        globalCache.conn = null;
        logMongoError("Connection", err);
        throw err;
      });
  }

  try {
    return await globalCache.promise;
  } catch (err) {
    globalCache.promise = null;
    throw err;
  }
}

/** Eager connect — call when the server / serverless function loads */
export function initDatabase() {
  return connectDB().catch((err) => {
    logMongoError("Init", err);
    return null;
  });
}

export function getLastMongoError() {
  return globalCache.lastError;
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export function getMongoStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}

export function getMongoDiagnostics() {
  const uri = getMongoUri();
  return {
    configured: Boolean(uri),
    uriPreview: getMongoUriForLogs(),
    status: getMongoStatus(),
    connected: isMongoConnected(),
    database: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
    runtime: process.env.VERCEL ? "vercel" : "node",
    lastError: globalCache.lastError,
  };
}