/**
 * Daily learning missions — next roadmap topic per student progress
 */

import { getOrderedRoadmapTopics, getTopicById, topicTrackFromId } from "../data/roadmap.js";
import { canOpenLesson } from "../auth/access.js";
import { getSessionUser } from "../auth/session.js";
import { isTopicCompleted } from "./roadmap-progress.js";
import { todayKey, yesterdayKey } from "./helpers.js";
import {
  getLearningMissionMeta,
  setLearningMissionAssignment,
  clearLearningMissionAssignment,
} from "./db.js";

function getContinueLearningTopic(user) {
  const ordered = getOrderedRoadmapTopics();
  return ordered.find((t) => !isTopicCompleted(t.id) && canOpenLesson(user, t))
    ?? ordered.find((t) => canOpenLesson(user, t))
    ?? null;
}

/**
 * Resolve today's learning topic assignment (carry incomplete from yesterday).
 */
export function resolveLearningAssignment() {
  const user = getSessionUser();
  const today = todayKey();
  const yesterday = yesterdayKey();
  const meta = getLearningMissionMeta();
  const nextTopic = getContinueLearningTopic(user);

  if (!nextTopic) {
    if (meta.topicId || meta.assignedDate) {
      clearLearningMissionAssignment();
    }
    return null;
  }

  const { topicId: storedId, assignedDate: storedDate } = meta;

  if (storedId && storedDate === yesterday && !isTopicCompleted(storedId)) {
    const topic = getTopicById(storedId) || nextTopic;
    return { topicId: storedId, assignedDate: storedDate, topic };
  }

  if (storedId && storedDate === today) {
    const topic = getTopicById(storedId) || nextTopic;
    return { topicId: storedId, assignedDate: storedDate, topic };
  }

  setLearningMissionAssignment(nextTopic.id, today);
  return { topicId: nextTopic.id, assignedDate: today, topic: nextTopic };
}

/**
 * @returns {object|null} Mission view item for the learning group
 */
export function computeLearningMissionItem() {
  const assignment = resolveLearningAssignment();
  if (!assignment?.topic) return null;

  const today = todayKey();
  const yesterday = yesterdayKey();
  const { topic, topicId, assignedDate } = assignment;
  const done = isTopicCompleted(topicId);
  const phase = topic.phase;
  const track = topicTrackFromId(topicId);

  let due = "Today";
  if (assignedDate === yesterday && !done) due = "From yesterday";
  else if (done) due = "Complete";

  return {
    id: `learning-${topicId}`,
    topicId,
    title: topic.name,
    topic: `Phase ${phase}${topic.step ? ` · Step ${topic.step}` : ""}`,
    difficulty: topic.difficulty,
    type: "learning",
    due,
    reviewLabel: null,
    done,
    carriedOver: assignedDate === yesterday && !done,
    time: "20m",
    leetcodeUrl: null,
    leetcodeSlug: null,
    phase,
    step: topic.step ?? null,
    track,
  };
}