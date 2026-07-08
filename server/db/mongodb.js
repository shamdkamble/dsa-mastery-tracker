/**
 * MongoDB Atlas connection — serverless-safe with detailed diagnostics
 */

import mongoose from "mongoose";

const LOG_PREFIX = "[mongodb]";
const DEFAULT_DB_NAME = "dsa-mastery";

/** @type {{ conn: typeof mongoose | null, promise: Promise<typeof mongoose> | null, lastError: object | null, source: string | null }} */
const globalCache = globalThis.__dsaMongoCache ?? {
  conn: null,
  promise: null,
  lastError: null,
  source: null,
};
globalThis.__dsaMongoCache = globalCache;

function cleanEnv(value) {
  if (!value?.trim()) return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Build URI from separate env vars (recommended for Vercel — avoids paste/encoding issues).
 */
function buildUriFromParts() {
  const user = cleanEnv(process.env.MONGODB_USER);
  const pass = cleanEnv(process.env.MONGODB_PASSWORD);
  const host = cleanEnv(process.env.MONGODB_HOST || process.env.MONGODB_CLUSTER);
  const db = cleanEnv(process.env.MONGODB_DB) || DEFAULT_DB_NAME;

  if (!user || !pass || !host) {
    return null;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  const cleanHost = host.replace(/^mongodb\+srv:\/\//, "").replace(/\/$/, "");

  globalCache.source = "parts";
  return `mongodb+srv://${encodedUser}:${encodedPass}@${cleanHost}/${db}?retryWrites=true&w=majority&appName=Cluster0`;
}

/**
 * Parse mongodb+srv://user:pass@host/db?opts and rebuild with encoded credentials.
 */
function normalizeExistingUri(raw) {
  let uri = raw.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(`MONGODB_URI must start with mongodb:// or mongodb+srv:// (got: ${uri.slice(0, 24)}...)`);
  }

  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)(?:([^:@]+)(?::([^@]*))?@)?([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);

  if (match) {
    const [, protocol, user, pass, host, path = "", query = "", hash = ""] = match;
    const encodedUser = user ? encodeURIComponent(decodeURIComponent(user)) : "";
    const encodedPass = pass ? encodeURIComponent(decodeURIComponent(pass)) : "";
    const auth = encodedUser ? `${encodedUser}${encodedPass ? `:${encodedPass}` : ""}@` : "";
    let dbPath = (path || "").replace(/^\/+/, "");
    if (!dbPath) dbPath = DEFAULT_DB_NAME;
    const qs = query || "?retryWrites=true&w=majority";
    uri = `${protocol}${auth}${host}/${dbPath}${qs}${hash || ""}`;
  }

  uri = uri.replace(/(mongodb(?:\+srv)?:\/\/[^/]+)\/+/g, "$1/");
  globalCache.source = "uri";
  return uri;
}

/**
 * Resolve MongoDB connection string at runtime.
 */
export function getMongoUri() {
  const fromParts = buildUriFromParts();
  if (fromParts) return fromParts;

  const raw = process.env.MONGODB_URI;
  if (!raw?.trim()) {
    globalCache.source = null;
    return null;
  }

  return normalizeExistingUri(raw);
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
  if (err.cause?.message) base.cause = err.cause.message;

  if (base.message.includes("bad auth") || base.codeName === "AtlasError") {
    base.hint = "Reset the database user password in MongoDB Atlas → Database Access, then update MONGODB_PASSWORD or MONGODB_URI on Vercel and redeploy.";
  }

  return base;
}

function logMongoError(phase, err) {
  const details = formatMongoError(err);
  console.error(`${LOG_PREFIX} ${phase} failed:`, details.message);
  console.error(`${LOG_PREFIX} Error name:`, details.name);
  console.error(`${LOG_PREFIX} Error code:`, details.code);
  if (details.codeName) console.error(`${LOG_PREFIX} Code name:`, details.codeName);
  if (details.hint) console.error(`${LOG_PREFIX} Hint:`, details.hint);
  if (details.reason) console.error(`${LOG_PREFIX} Reason:`, details.reason);
  if (details.cause) console.error(`${LOG_PREFIX} Cause:`, details.cause);
  if (err?.stack) console.error(`${LOG_PREFIX} Stack:`, err.stack);
  globalCache.lastError = details;
}

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

export async function connectDB() {
  if (globalCache.conn && mongoose.connection.readyState === 1) {
    return globalCache.conn;
  }

  if (mongoose.connection.readyState === 1) {
    globalCache.conn = mongoose;
    return mongoose;
  }

  let uri;
  try {
    uri = getMongoUri();
  } catch (err) {
    logMongoError("URI parse", err);
    throw err;
  }

  if (!uri) {
    const err = new Error(
      "MongoDB is not configured. Set MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST (recommended) or MONGODB_URI on Vercel, then redeploy.",
    );
    err.code = "MONGODB_URI_MISSING";
    throw err;
  }

  if (!globalCache.promise) {
    console.log(`${LOG_PREFIX} Connecting to Atlas...`);
    console.log(`${LOG_PREFIX} Source: ${globalCache.source || "unknown"}`);
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
  let uri = null;
  let parseError = null;
  try {
    uri = getMongoUri();
  } catch (err) {
    parseError = formatMongoError(err);
  }

  return {
    configured: Boolean(uri),
    source: globalCache.source,
    hasSplitConfig: Boolean(
      cleanEnv(process.env.MONGODB_USER)
      && cleanEnv(process.env.MONGODB_PASSWORD)
      && cleanEnv(process.env.MONGODB_HOST || process.env.MONGODB_CLUSTER),
    ),
    uriPreview: getMongoUriForLogs(),
    status: getMongoStatus(),
    connected: isMongoConnected(),
    database: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
    runtime: process.env.VERCEL ? "vercel" : "node",
    parseError,
    lastError: globalCache.lastError,
  };
}