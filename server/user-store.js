/**
 * Persistent user store — local JSON file in dev, Vercel Blob in production.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { head, put } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LOCAL_DATA_DIR = path.join(ROOT, "data");
const LOCAL_USERS_PATH = path.join(LOCAL_DATA_DIR, "users.json");
const SEED_PATH = path.join(ROOT, "data", "users.seed.json");
const BLOB_PATHNAME = "dsa-mastery/users.json";

const IS_VERCEL = Boolean(process.env.VERCEL);
const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function emptyStore() {
  return { users: [] };
}

function parseStore(raw) {
  const data = JSON.parse(raw);
  return { users: Array.isArray(data.users) ? data.users : [] };
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

async function readBlobStore() {
  try {
    const blob = await head(BLOB_PATHNAME);
    const response = await fetch(blob.url);
    if (!response.ok) {
      throw new Error(`Blob fetch failed (${response.status}).`);
    }
    return parseStore(await response.text());
  } catch (err) {
    if (err?.name === "BlobNotFoundError" || err?.message?.includes("does not exist")) {
      return emptyStore();
    }
    throw err;
  }
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
 * @returns {"blob" | "file" | "tmp"}
 */
export function resolveUserStoreBackend() {
  if (USE_BLOB) return "blob";
  if (!IS_VERCEL) return "file";
  return "tmp";
}

export function getUserStoreLabel() {
  const backend = resolveUserStoreBackend();
  if (backend === "blob") return "vercel-blob";
  if (backend === "file") return "local-file";
  return "ephemeral-tmp";
}

if (IS_VERCEL && !USE_BLOB) {
  console.warn(
    "[user-store] BLOB_READ_WRITE_TOKEN is not set. User data will be lost on redeploy.",
    "Add Vercel Blob storage and connect it to this project.",
  );
}

/**
 * @returns {Promise<{ users: object[] }>}
 */
export async function readUsersStore() {
  const backend = resolveUserStoreBackend();

  if (backend === "blob") {
    return readBlobStore();
  }

  if (backend === "file") {
    return readLocalStore();
  }

  // Legacy ephemeral fallback (should not be used in production)
  const tmpPath = "/tmp/users.json";
  if (!existsSync(tmpPath)) {
    return emptyStore();
  }
  return parseStore(readFileSync(tmpPath, "utf8"));
}

/**
 * @param {{ users: object[] }} data
 * @returns {Promise<void>}
 */
export async function writeUsersStore(data) {
  const backend = resolveUserStoreBackend();

  if (backend === "blob") {
    await writeBlobStore(data);
    return;
  }

  if (backend === "file") {
    writeLocalStore(data);
    return;
  }

  const tmpDir = "/tmp";
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  writeFileSync("/tmp/users.json", JSON.stringify(data, null, 2), "utf8");
}