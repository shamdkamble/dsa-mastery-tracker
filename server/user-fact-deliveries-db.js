/**
 * User learning fact delivery tracking
 */

import { connectDB } from "./db/mongodb.js";
import { UserFactDelivery } from "./models/UserFactDelivery.js";

function normalize(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    userId: d.userId,
    factId: d.factId,
    topicId: d.topicId,
    notificationId: d.notificationId || null,
    channel: d.channel || "both",
    deliveredAt: d.deliveredAt ? new Date(d.deliveredAt).toISOString() : null,
  };
}

export async function recordUserFactDelivery(userId, {
  factId,
  topicId,
  notificationId = null,
  channel = "both",
} = {}) {
  if (!userId || !factId || !topicId) return null;

  await connectDB();

  try {
    const doc = await UserFactDelivery.create({
      userId,
      factId,
      topicId,
      notificationId,
      channel,
      deliveredAt: new Date(),
    });
    return normalize(doc);
  } catch (err) {
    if (err?.code === 11000) return null;
    throw err;
  }
}

export async function listDeliveredFactIdsForUser(userId, topicId) {
  if (!userId) return [];

  await connectDB();

  const query = { userId };
  if (topicId) query.topicId = topicId;

  const docs = await UserFactDelivery.find(query).select({ factId: 1 }).lean();
  return docs.map((d) => d.factId);
}

export async function hasUserReceivedFact(userId, factId) {
  if (!userId || !factId) return false;

  await connectDB();
  const count = await UserFactDelivery.countDocuments({ userId, factId });
  return count > 0;
}