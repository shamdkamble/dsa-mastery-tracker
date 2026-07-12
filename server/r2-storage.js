/**
 * Cloudflare R2 — S3-compatible object storage
 */

import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const MAX_IMAGE_BYTES = 200 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

let s3Client = null;

function cleanEnv(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function firstEnv(...keys) {
  for (const key of keys) {
    const value = cleanEnv(process.env[key]);
    if (value) return value;
  }
  return "";
}

function accountIdFromEndpoint(endpoint) {
  const match = String(endpoint || "").match(/https:\/\/([a-f0-9]{32})\.r2\.cloudflarestorage\.com/i);
  return match?.[1] || "";
}

export function getR2Config() {
  const endpoint = firstEnv("R2_S3_ENDPOINT", "R2_ENDPOINT", "S3_ENDPOINT")
    || "";
  const accountId = firstEnv("R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID")
    || accountIdFromEndpoint(endpoint);
  const accessKeyId = firstEnv("R2_ACCESS_KEY_ID", "R2_ACCESS_KEY", "AWS_ACCESS_KEY_ID");
  const secretAccessKey = firstEnv("R2_SECRET_ACCESS_KEY", "R2_SECRET_KEY", "AWS_SECRET_ACCESS_KEY");
  const bucket = firstEnv("R2_BUCKET_NAME", "R2_BUCKET", "S3_BUCKET_NAME");
  const publicBaseUrl = firstEnv(
    "R2_PUBLIC_BASE_URL",
    "R2_PUBLIC_URL",
    "R2_PUBLIC_BASE",
    "CDN_BASE_URL",
    "PUBLIC_BASE_URL",
  ).replace(/\/$/, "");
  const resolvedEndpoint = endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    endpoint: resolvedEndpoint,
  };
}

const REQUIRED_ENV_HINTS = [
  ["accessKeyId", "R2_ACCESS_KEY_ID"],
  ["secretAccessKey", "R2_SECRET_ACCESS_KEY"],
  ["bucket", "R2_BUCKET_NAME"],
  ["publicBaseUrl", "R2_PUBLIC_BASE_URL"],
  ["endpoint", "R2_ACCOUNT_ID or R2_S3_ENDPOINT"],
];

export function getR2ConfigDiagnostics() {
  const cfg = getR2Config();
  const missing = REQUIRED_ENV_HINTS
    .filter(([field]) => !cfg[field])
    .map(([, hint]) => hint);

  return {
    configured: missing.length === 0,
    missing,
    hasAccessKey: Boolean(cfg.accessKeyId),
    hasSecret: Boolean(cfg.secretAccessKey),
    hasBucket: Boolean(cfg.bucket),
    hasPublicBaseUrl: Boolean(cfg.publicBaseUrl),
    hasEndpoint: Boolean(cfg.endpoint),
  };
}

export function isR2Configured() {
  return getR2ConfigDiagnostics().configured;
}

export function assertR2Configured() {
  const diagnostics = getR2ConfigDiagnostics();
  if (diagnostics.configured) return diagnostics;

  const missing = diagnostics.missing.join(", ");
  throw new MediaStorageError(
    missing
      ? `Image storage is not configured. Missing: ${missing}`
      : "Image storage is not configured.",
    { status: 503, code: "STORAGE_UNAVAILABLE", details: diagnostics },
  );
}

function getClient() {
  if (s3Client) return s3Client;
  const cfg = getR2Config();
  if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error("R2 is not configured.");
  }

  s3Client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  return s3Client;
}

export function buildPublicUrl(key) {
  const { publicBaseUrl } = getR2Config();
  const normalizedKey = String(key || "").replace(/^\/+/, "");
  return `${publicBaseUrl}/${normalizedKey}`;
}

export function extensionForContentType(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function assertValidImageUpload(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new MediaStorageError("Image payload is empty.", { status: 400, code: "INVALID_INPUT" });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new MediaStorageError("Image must be 200 KB or smaller after compression.", { status: 400, code: "FILE_TOO_LARGE" });
  }
  const type = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (!ALLOWED_CONTENT_TYPES.has(type)) {
    throw new MediaStorageError("Only JPEG, PNG, and WebP images are allowed.", { status: 400, code: "INVALID_INPUT" });
  }
  return type;
}

export class MediaStorageError extends Error {
  constructor(message, { status = 400, code = "MEDIA_ERROR" } = {}) {
    super(message);
    this.name = "MediaStorageError";
    this.status = status;
    this.code = code;
  }
}

export async function uploadObject({ key, body, contentType }) {
  const cfg = getR2Config();
  const client = getClient();

  await client.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return buildPublicUrl(key);
}

export async function deleteObject(key) {
  const cfg = getR2Config();
  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  }));
}

export function publicUrlToKey(url) {
  const { publicBaseUrl } = getR2Config();
  const normalized = String(url || "").trim();
  if (!normalized.startsWith(`${publicBaseUrl}/`)) return null;
  return normalized.slice(publicBaseUrl.length + 1);
}

export function isAllowedProfilePhotoUrl(url, userId) {
  const key = publicUrlToKey(url);
  if (!key) return false;
  return key === `users/${userId}/avatar.jpg`
    || key === `users/${userId}/avatar.png`
    || key === `users/${userId}/avatar.webp`;
}

export function isAllowedChatImageUrl(url, threadId) {
  const key = publicUrlToKey(url);
  if (!key) return false;
  return key.startsWith(`chat/${threadId}/`);
}

export function profilePhotoKey(userId, contentType) {
  const ext = extensionForContentType(contentType);
  return `users/${userId}/avatar.${ext}`;
}

export function chatImageKey(threadId, contentType) {
  const ext = extensionForContentType(contentType);
  return `chat/${threadId}/${randomUUID()}.${ext}`;
}