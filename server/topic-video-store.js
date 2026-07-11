/**
 * Topic YouTube videos — admin-managed secondary learn content
 */

import { TopicVideo, toTopicVideoDto } from "./models/TopicVideo.js";
import { getTopicById, getOrderedRoadmapTopics } from "./roadmap-catalog.js";

export class TopicVideoError extends Error {
  constructor(message, { status = 400, code = "VIDEO_ERROR" } = {}) {
    super(message);
    this.name = "TopicVideoError";
    this.status = status;
    this.code = code;
  }
}

export function parseYouTubeUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let videoId = null;

  try {
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || null;
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2] || null;
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] || null;
      } else {
        videoId = parsed.searchParams.get("v");
      }
    }
  } catch {
    return null;
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

  return {
    videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
  };
}

function buildPublicVideoDto(doc) {
  if (!doc) return { available: false };
  const parsed = parseYouTubeUrl(doc.youtubeUrl) || { videoId: doc.videoId };
  return {
    available: true,
    topicId: doc.topicId,
    title: doc.title || doc.topicName || "Topic video",
    youtubeUrl: doc.youtubeUrl,
    videoId: parsed.videoId || doc.videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${parsed.videoId || doc.videoId}`,
  };
}

export async function getTopicVideo(topicId) {
  const doc = await TopicVideo.findOne({ topicId }).lean();
  if (!doc) return { available: false, topicId };
  return buildPublicVideoDto(doc);
}

export async function listTopicVideosAdmin() {
  const [docs, topics] = await Promise.all([
    TopicVideo.find().lean(),
    Promise.resolve(getOrderedRoadmapTopics()),
  ]);

  const byTopicId = new Map(docs.map((d) => [d.topicId, toTopicVideoDto(d)]));

  return {
    topics: topics.map((t) => ({
      id: t.id,
      name: t.name,
      phase: t.phase,
      difficulty: t.difficulty,
      video: byTopicId.get(t.id) || null,
    })),
    stats: {
      totalTopics: topics.length,
      withVideo: docs.length,
    },
  };
}

export async function upsertTopicVideo(topicId, { youtubeUrl, title, updatedBy } = {}) {
  const topic = getTopicById(topicId);
  if (!topic) {
    throw new TopicVideoError("Unknown topic.", { status: 404, code: "NOT_FOUND" });
  }

  const trimmedUrl = String(youtubeUrl || "").trim();

  if (!trimmedUrl) {
    await TopicVideo.deleteOne({ topicId });
    return { ok: true, topicId, cleared: true };
  }

  const parsed = parseYouTubeUrl(trimmedUrl);
  if (!parsed) {
    throw new TopicVideoError(
      "Enter a valid YouTube link (youtube.com/watch?v=… or youtu.be/…).",
      { status: 400, code: "INVALID_URL" },
    );
  }

  const doc = await TopicVideo.findOneAndUpdate(
    { topicId },
    {
      $set: {
        topicId,
        topicName: topic.name,
        phase: topic.phase,
        youtubeUrl: parsed.youtubeUrl,
        videoId: parsed.videoId,
        title: String(title || "").trim() || topic.name,
        updatedBy: updatedBy || null,
      },
    },
    { upsert: true, new: true },
  );

  return { ok: true, video: toTopicVideoDto(doc) };
}