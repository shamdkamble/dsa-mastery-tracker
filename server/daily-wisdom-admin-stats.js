/**
 * Daily Wisdom admin dashboard aggregates
 */

import { getLearningFactsPoolStats } from "./learning-fact-generator.js";
import {
  getPushDeliveryStatsForSource,
  listRecentPushLogsBySource,
} from "./push-delivery-log-db.js";
import { previewLearningFactForUser } from "./learning-fact-delivery.js";

const WISDOM_SOURCE = "learning-fact";

export async function getDailyWisdomAdminDashboard(adminUserId) {
  const [pool, delivery, recentActivity, preview] = await Promise.all([
    getLearningFactsPoolStats(),
    getPushDeliveryStatsForSource(WISDOM_SOURCE, { days: 30 }),
    listRecentPushLogsBySource(WISDOM_SOURCE, { limit: 8 }),
    adminUserId ? previewLearningFactForUser(adminUserId) : Promise.resolve(null),
  ]);

  const topicsCoveredPct = pool.totalTopics > 0
    ? Math.round((pool.topicsWithFacts / pool.totalTopics) * 100)
    : 0;

  return {
    pool: {
      ...pool,
      topicsCoveredPct,
    },
    delivery,
    recentActivity,
    preview: preview
      ? {
          anchor: preview.anchor,
          previewMessage: preview.previewMessage,
          context: preview.context,
          availableFacts: preview.availableFacts,
        }
      : null,
  };
}