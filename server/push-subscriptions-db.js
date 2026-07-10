/**
 * Web Push subscription persistence
 */

import { connectDB } from "./db/mongodb.js";
import { PushSubscription } from "./models/PushSubscription.js";

function normalize(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(d._id),
    userId: d.userId,
    endpoint: d.endpoint,
    p256dh: d.p256dh,
    auth: d.auth,
    userAgent: d.userAgent || "",
    lastUsedAt: d.lastUsedAt ? new Date(d.lastUsedAt).toISOString() : null,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
  };
}

export async function upsertPushSubscription(userId, subscription, userAgent = "") {
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return null;
  }

  await connectDB();

  const doc = await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: String(userAgent || "").slice(0, 512),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return normalize(doc);
}

export async function deletePushSubscription(userId, endpoint) {
  if (!userId || !endpoint) return false;

  await connectDB();
  const result = await PushSubscription.deleteOne({ userId, endpoint });
  return result.deletedCount > 0;
}

export async function deleteAllPushSubscriptionsForUser(userId) {
  if (!userId) return 0;

  await connectDB();
  const result = await PushSubscription.deleteMany({ userId });
  return result.deletedCount;
}

export async function listPushSubscriptionsForUser(userId) {
  if (!userId) return [];

  await connectDB();
  const docs = await PushSubscription.find({ userId }).sort({ updatedAt: -1 }).lean();
  return docs.map(normalize);
}

export async function hasPushSubscription(userId) {
  if (!userId) return false;

  await connectDB();
  const count = await PushSubscription.countDocuments({ userId });
  return count > 0;
}

export async function deletePushSubscriptionByEndpoint(endpoint) {
  if (!endpoint) return false;

  await connectDB();
  const result = await PushSubscription.deleteOne({ endpoint });
  return result.deletedCount > 0;
}

export async function touchPushSubscription(endpoint) {
  if (!endpoint) return;

  await connectDB();
  await PushSubscription.updateOne({ endpoint }, { $set: { lastUsedAt: new Date() } });
}

export async function listDistinctUserIdsWithPushSubscriptions() {
  await connectDB();
  return PushSubscription.distinct("userId");
}