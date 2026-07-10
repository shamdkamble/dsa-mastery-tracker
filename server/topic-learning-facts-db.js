/**
 * Topic learning fact persistence
 */

import { connectDB } from "./db/mongodb.js";
import { TopicLearningFact } from "./models/TopicLearningFact.js";
import { PILOT_LEARNING_FACTS, toFactDocument } from "./data/learning-facts-seed.js";

function normalize(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d.id,
    topicId: d.topicId,
    phase: d.phase ?? null,
    topicName: d.topicName || "",
    hookStyle: d.hookStyle || "curiosity",
    title: d.title,
    body: d.body,
    deepLink: d.deepLink,
    source: d.source || "seed",
    active: Boolean(d.active),
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
  };
}

export async function upsertTopicLearningFact(entry) {
  if (!entry?.id || !entry?.topicId || !entry?.title || !entry?.body || !entry?.deepLink) {
    return null;
  }

  await connectDB();

  const doc = await TopicLearningFact.findOneAndUpdate(
    { id: entry.id },
    {
      $set: {
        topicId: entry.topicId,
        phase: entry.phase ?? null,
        topicName: entry.topicName || "",
        hookStyle: entry.hookStyle || "curiosity",
        title: entry.title,
        body: entry.body,
        deepLink: entry.deepLink,
        source: entry.source || "seed",
        active: entry.active !== false,
      },
    },
    { upsert: true, new: true },
  );

  return normalize(doc);
}

export async function listFactsForTopic(topicId, { activeOnly = true } = {}) {
  if (!topicId) return [];

  await connectDB();

  const query = { topicId };
  if (activeOnly) query.active = true;

  const docs = await TopicLearningFact.find(query)
    .sort({ createdAt: 1 })
    .lean();

  return docs.map(normalize);
}

export async function getFactById(factId) {
  if (!factId) return null;

  await connectDB();
  const doc = await TopicLearningFact.findOne({ id: factId, active: true }).lean();
  return normalize(doc);
}

export async function countFactsForTopic(topicId) {
  if (!topicId) return 0;

  await connectDB();
  return TopicLearningFact.countDocuments({ topicId, active: true });
}

export async function seedPilotLearningFacts() {
  await connectDB();

  let inserted = 0;
  let updated = 0;

  for (const seed of PILOT_LEARNING_FACTS) {
    const existing = await TopicLearningFact.findOne({ id: seed.id }).lean();
    await upsertTopicLearningFact(toFactDocument(seed));
    if (existing) updated += 1;
    else inserted += 1;
  }

  return {
    total: PILOT_LEARNING_FACTS.length,
    inserted,
    updated,
    topicIds: [...new Set(PILOT_LEARNING_FACTS.map((f) => f.topicId))],
  };
}