/**
 * Push delivery audit log persistence
 */

import crypto from "crypto";
import { connectDB } from "./db/mongodb.js";
import { PushDeliveryLog } from "./models/PushDeliveryLog.js";
import { findUserById } from "./users-db.js";

function generateLogId() {
  return `pushlog_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function endpointPreview(endpoint) {
  if (!endpoint) return "";
  const str = String(endpoint);
  if (str.length <= 48) return str;
  return `${str.slice(0, 24)}…${str.slice(-16)}`;
}

function normalize(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d.id,
    userId: d.userId,
    userName: d.userName || "",
    userEmail: d.userEmail || "",
    source: d.source,
    eventTag: d.eventTag || "",
    notificationId: d.notificationId || null,
    title: d.title,
    body: d.body || "",
    pushTag: d.pushTag || "",
    status: d.status,
    reason: d.reason || "",
    errorCode: d.errorCode ?? null,
    errorMessage: d.errorMessage || "",
    endpointPreview: d.endpointPreview || "",
    userAgent: d.userAgent || "",
    devicesSent: d.devicesSent ?? 0,
    devicesFailed: d.devicesFailed ?? 0,
    devicesTotal: d.devicesTotal ?? 0,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
  };
}

async function resolveUserInfo(userId, hints = {}) {
  if (hints.userName && hints.userEmail) {
    return { userName: hints.userName, userEmail: hints.userEmail };
  }

  if (userId === "admin") {
    return {
      userName: hints.userName || "Administrator",
      userEmail: hints.userEmail || "admin@dsa-mastery.local",
    };
  }

  try {
    const user = await findUserById(userId);
    if (user) {
      return {
        userName: hints.userName || user.name || "",
        userEmail: hints.userEmail || user.email || "",
      };
    }
  } catch (err) {
    console.warn("[push-delivery-log] user lookup failed:", err?.message || err);
  }

  return {
    userName: hints.userName || "",
    userEmail: hints.userEmail || "",
  };
}

/**
 * @param {object} entry
 */
export async function createPushDeliveryLog(entry) {
  if (!entry?.userId || !entry?.source || !entry?.title || !entry?.status) {
    return null;
  }

  await connectDB();

  const { userName, userEmail } = await resolveUserInfo(entry.userId, entry);

  const doc = await PushDeliveryLog.create({
    id: generateLogId(),
    userId: entry.userId,
    userName,
    userEmail,
    source: entry.source,
    eventTag: entry.eventTag || "",
    notificationId: entry.notificationId || null,
    title: entry.title,
    body: entry.body || "",
    pushTag: entry.pushTag || "",
    status: entry.status,
    reason: entry.reason || "",
    errorCode: entry.errorCode ?? null,
    errorMessage: entry.errorMessage || "",
    endpointPreview: endpointPreview(entry.endpoint || entry.endpointPreview),
    userAgent: String(entry.userAgent || "").slice(0, 512),
    devicesSent: entry.devicesSent ?? 0,
    devicesFailed: entry.devicesFailed ?? 0,
    devicesTotal: entry.devicesTotal ?? 0,
  });

  return normalize(doc);
}

/**
 * @param {{ limit?: number, status?: string, source?: string, userId?: string, search?: string }} filters
 */
export async function listPushDeliveryLogs({
  limit = 100,
  status,
  source,
  userId,
  search,
} = {}) {
  await connectDB();

  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (source && source !== "all") {
    query.source = source;
  }

  if (userId) {
    query.userId = userId;
  }

  if (search?.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { userName: regex },
      { userEmail: regex },
      { title: regex },
      { eventTag: regex },
      { errorMessage: regex },
      { reason: regex },
    ];
  }

  const docs = await PushDeliveryLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 500))
    .lean();

  return docs.map(normalize);
}

export async function getPushDeliveryLogStats() {
  await connectDB();

  const [total, sent, failed, skipped] = await Promise.all([
    PushDeliveryLog.countDocuments(),
    PushDeliveryLog.countDocuments({ status: "sent" }),
    PushDeliveryLog.countDocuments({ status: "failed" }),
    PushDeliveryLog.countDocuments({ status: "skipped" }),
  ]);

  return { total, sent, failed, skipped };
}