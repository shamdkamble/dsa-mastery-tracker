/**
 * Persistent user store
 * Priority: Redis/KV → Vercel Blob → local file → /tmp (ephemeral)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Redis } from "@upstash/redis";
import { head, put, list } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LOCAL_DATA_DIR = path.join(ROOT, "data");
const LOCAL_USERS_PATH = path.join(LOCAL_DATA_DIR, "users.json");
const SEED_PATH = path.join(ROOT, "data", "users.seed.json");
const BLOB_PATHNAME = "dsa-mastery/users.json";
const REDIS_KEY = "dsa-mastery:users";

const IS_VERCEL = Boolean(process.env.VERCEL);

let redisClient = null;

function emptyStore() {
  return { users: [] };
}

function parseStore(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return { users: Array.isArray(data?.users) ? data.users : [] };
}

function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL
    || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
    || process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  redisClient = new Redis({ url, token });
  return redisClient;
}

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function ensureLocalStore() {
  if (!existsSync(LOCAL_DATA_DIR)) {
    mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }

  if (!existsSync(LOCAL_USERS_PATH)) {
    const seed = existsSync(SEED_PATH)
      ? readFileSync(SEED_PATH, "utf8")
      : JSON.stringify(emptyStore(), null, 2);
    writeFileSync(LOCAL_USERS_PATH, seed, "utf8");
  }
}

async function readLocalStore() {
  ensureLocalStore();
  return parseStore(readFileSync(LOCAL_USERS_PATH, "utf8"));
}

function writeLocalStore(data) {
  ensureLocalStore();
  writeFileSync(LOCAL_USERS_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function readRedisStore() {
  const redis = getRedis();
  const data = await redis.get(REDIS_KEY);
  if (!data) return emptyStore();
  return parseStore(data);
}

async function writeRedisStore(data) {
  const redis = getRedis();
  await redis.set(REDIS_KEY, data);
}

async function readBlobStore() {
  let blobUrl = null;

  try {
    const blob = await head(BLOB_PATHNAME);
    blobUrl = blob.url;
  } catch {
    const { blobs } = await list({ prefix: "dsa-mastery/", limit: 10 });
    const match = blobs.find((b) => b.pathname === BLOB_PATHNAME || b.url?.includes("users.json"));
    blobUrl = match?.url || null;
  }

  if (!blobUrl) return emptyStore();

  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Blob fetch failed (${response.status}).`);
  }
  return parseStore(await response.text());
}

async function writeBlobStore(data) {
  await put(BLOB_PATHNAME, JSON.stringify(data, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/**
 * @returns {"redis" | "blob" | "file" | "tmp"}
 */
export function resolveUserStoreBackend() {
  if (getRedis()) return "redis";
  if (hasBlob()) return "blob";
  if (!IS_VERCEL) return "file";
  return "tmp";
}

export function getUserStoreLabel() {
  const backend = resolveUserStoreBackend();
  if (backend === "redis") return "redis";
  if (backend === "blob") return "vercel-blob";
  if (backend === "file") return "local-file";
  return "ephemeral-tmp";
}

export function isUserStorePersistent() {
  return resolveUserStoreBackend() !== "tmp";
}

if (IS_VERCEL && !isUserStorePersistent()) {
  console.error(
    "[user-store] No persistent storage configured. User accounts will be lost on redeploy.",
    "Add Vercel KV/Redis (recommended) or Blob storage in the Vercel dashboard → Storage.",
  );
}

/**
 * @returns {Promise<{ users: object[] }>}
 */
export async function readUsersStore() {
  const backend = resolveUserStoreBackend();

  if (backend === "redis") return readRedisStore();
  if (backend === "blob") return readBlobStore();
  if (backend === "file") return readLocalStore();

  const tmpPath = "/tmp/users.json";
  if (!existsSync(tmpPath)) return emptyStore();
  return parseStore(readFileSync(tmpPath, "utf8"));
}

/**
 * @param {{ users: object[] }} data
 * @returns {Promise<void>}
 */
export async function writeUsersStore(data) {
  const backend = resolveUserStoreBackend();

  if (backend === "redis") {
    await writeRedisStore(data);
    return;
  }

  if (backend === "blob") {
    await writeBlobStore(data);
    return;
  }

  if (backend === "file") {
    writeLocalStore(data);
    return;
  }

  const tmpDir = "/tmp";
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  writeFileSync("/tmp/users.json", JSON.stringify(data, null, 2), "utf8");
}