/**
 * Deliver cached learning facts to users based on roadmap anchor
 */

import { createUserNotification, markNotificationPushSent } from "./notifications-db.js";
import { sendPushToUser } from "./push-service.js";
import { getLearningAnchor } from "./learning-anchor.js";
import {
  listFactsForTopic,
  getFactById,
} from "./topic-learning-facts-db.js";
import {
  listDeliveredFactIdsForUser,
  recordUserFactDelivery,
} from "./user-fact-deliveries-db.js";
import { personalizeLearningFactMessage } from "./learning-fact-personalize.js";
import { resolveUserDisplayName } from "./learning-fact-users.js";

/**
 * Pick the next fact for a user at their anchor topic that they have not seen.
 */
export async function pickNextFactForUser(userId, topicId) {
  const [facts, deliveredIds] = await Promise.all([
    listFactsForTopic(topicId),
    listDeliveredFactIdsForUser(userId, topicId),
  ]);

  if (!facts.length) return null;

  const delivered = new Set(deliveredIds);
  return facts.find((fact) => !delivered.has(fact.id)) || null;
}

/**
 * @param {string} userId
 * @param {{ factId?: string, sendPush?: boolean }} options
 */
export async function deliverLearningFactToUser(userId, { factId, sendPush = true } = {}) {
  const anchor = await getLearningAnchor(userId);
  if (!anchor) {
    return { ok: false, reason: "no_anchor", anchor: null, fact: null };
  }

  let fact = null;
  if (factId) {
    fact = await getFactById(factId);
    if (!fact || fact.topicId !== anchor.topicId) {
      return { ok: false, reason: "fact_not_for_anchor", anchor, fact: null };
    }
  } else {
    fact = await pickNextFactForUser(userId, anchor.topicId);
  }

  if (!fact) {
    return { ok: false, reason: "no_facts", anchor, fact: null };
  }

  const deliveredSet = new Set(await listDeliveredFactIdsForUser(userId, anchor.topicId));
  if (deliveredSet.has(fact.id)) {
    return { ok: false, reason: "already_delivered", anchor, fact };
  }

  const userName = await resolveUserDisplayName(userId);
  const message = personalizeLearningFactMessage(fact, {
    userName,
    topicName: anchor.topicName,
  });

  const notification = await createUserNotification(userId, {
    title: message.title,
    text: message.body,
    variant: "accent",
    href: fact.deepLink,
  }, {
    pushTag: `learning-fact-${anchor.topicId}`,
  });

  let push = null;
  if (sendPush) {
    push = await sendPushToUser(userId, {
      title: message.title,
      body: message.body,
      url: fact.deepLink,
      tag: `learning-fact-${anchor.topicId}`,
    }, {
      source: "learning-fact",
      eventTag: anchor.topicId,
      notificationId: notification?.id || null,
    });

    if (push?.sent > 0 && notification?.id) {
      await markNotificationPushSent(notification.id, userId);
    }
  }

  await recordUserFactDelivery(userId, {
    factId: fact.id,
    topicId: anchor.topicId,
    notificationId: notification?.id || null,
    channel: sendPush ? "both" : "in_app",
  });

  return {
    ok: true,
    anchor,
    fact,
    message,
    notification,
    push,
  };
}

/**
 * Preview anchor + next fact without delivering.
 */
export async function previewLearningFactForUser(userId) {
  const anchor = await getLearningAnchor(userId);
  if (!anchor) {
    return { anchor: null, fact: null, availableFacts: 0, deliveredCount: 0 };
  }

  const [facts, deliveredIds] = await Promise.all([
    listFactsForTopic(anchor.topicId),
    listDeliveredFactIdsForUser(userId, anchor.topicId),
  ]);

  const delivered = new Set(deliveredIds);
  const fact = facts.find((f) => !delivered.has(f.id)) || null;
  const userName = await resolveUserDisplayName(userId);
  const previewMessage = fact
    ? personalizeLearningFactMessage(fact, { userName, topicName: anchor.topicName })
    : null;

  return {
    anchor,
    fact,
    previewMessage,
    availableFacts: facts.length,
    deliveredCount: deliveredIds.length,
  };
}