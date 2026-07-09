/**
 * Lesson cache & roadmap progress — MongoDB
 */

import { Lesson, toLessonDto } from "./models/Lesson.js";
import { RoadmapProgress, toProgressDto } from "./models/RoadmapProgress.js";
import { teachTopic, teachTopicSimpler, TeachApiError } from "./gemini.js";

export class LessonStoreError extends Error {
  constructor(message, { status = 400, code = "LESSON_ERROR" } = {}) {
    super(message);
    this.name = "LessonStoreError";
    this.status = status;
    this.code = code;
  }
}

function topicMeta(topic) {
  return {
    topicId: topic.id,
    topicName: topic.name || topic.title || "Topic",
    phase: topic.phase ?? null,
    difficulty: topic.difficulty || "",
    track: topic.track || "",
  };
}

function variantPayload(result) {
  return {
    content: result.content,
    model: result.model || null,
    generatedAt: new Date().toISOString(),
  };
}

export async function getCachedLesson(topicId) {
  const doc = await Lesson.findOne({ topicId }).lean();
  if (!doc) return null;
  return toLessonDto(doc);
}

export async function getOrCreateStandardLesson(topic) {
  if (!topic?.id) {
    throw new LessonStoreError("Topic id is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const existing = await Lesson.findOne({ topicId: topic.id });
  if (existing?.standard?.content) {
    return {
      content: existing.standard.content,
      simplerContent: existing.simpler?.content || null,
      model: existing.standard.model,
      cached: true,
      hasSimpler: Boolean(existing.simpler?.content),
      topicId: topic.id,
    };
  }

  const result = await teachTopic(topic);
  const meta = topicMeta(topic);

  await Lesson.findOneAndUpdate(
    { topicId: topic.id },
    {
      $set: {
        ...meta,
        standard: variantPayload(result),
      },
    },
    { upsert: true, new: true },
  );

  return {
    content: result.content,
    model: result.model,
    usage: result.usage,
    cached: false,
    hasSimpler: false,
    topicId: topic.id,
  };
}

export async function getOrCreateSimplerLesson(topic) {
  if (!topic?.id) {
    throw new LessonStoreError("Topic id is required.", { status: 400, code: "INVALID_INPUT" });
  }

  let doc = await Lesson.findOne({ topicId: topic.id });

  if (doc?.simpler?.content) {
    return {
      content: doc.simpler.content,
      model: doc.simpler.model,
      cached: true,
      topicId: topic.id,
    };
  }

  if (!doc?.standard?.content) {
    await getOrCreateStandardLesson(topic);
    doc = await Lesson.findOne({ topicId: topic.id });
  }

  const standardContent = doc?.standard?.content;
  if (!standardContent) {
    throw new TeachApiError("Standard lesson missing — cannot simplify.", { status: 502, code: "EMPTY_RESPONSE" });
  }

  const result = await teachTopicSimpler(topic, standardContent);
  const meta = topicMeta(topic);

  await Lesson.findOneAndUpdate(
    { topicId: topic.id },
    {
      $set: {
        ...meta,
        simpler: variantPayload(result),
      },
    },
    { upsert: true, new: true },
  );

  return {
    content: result.content,
    model: result.model,
    usage: result.usage,
    cached: false,
    topicId: topic.id,
  };
}

export async function getUserRoadmapProgress(userId) {
  let doc = await RoadmapProgress.findOne({ userId });
  if (!doc) {
    doc = await RoadmapProgress.create({ userId, completedTopicIds: [] });
  }
  return toProgressDto(doc);
}

export async function markTopicComplete(userId, topicId) {
  if (!topicId) {
    throw new LessonStoreError("topicId is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const doc = await RoadmapProgress.findOneAndUpdate(
    { userId },
    { $addToSet: { completedTopicIds: topicId } },
    { upsert: true, new: true },
  );

  return toProgressDto(doc);
}