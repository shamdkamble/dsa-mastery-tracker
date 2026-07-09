/**
 * In-app notifications — derived from activity, mission, and auth state
 */

import { getSessionUser } from "../auth/session.js";
import { getActivities, getReadNotificationIds } from "../storage/db.js";
import { computeStats, computeTodaysMission } from "../storage/computed.js";
import { formatRelativeTime } from "../storage/helpers.js";

function variantForAction(action) {
  if (action === "Solved" || action === "Reviewed") return "success";
  if (action === "Failed attempt") return "danger";
  if (action === "Deleted") return "warning";
  return "default";
}

/**
 * Build the current notification feed (newest contextual items first).
 * @returns {Array<{ id: string, title: string, text: string, variant: string, time: string, href?: string }>}
 */
export function buildNotificationItems() {
  const items = [];
  const user = getSessionUser();

  if (user?.status === "pending") {
    items.push({
      id: "auth-pending",
      title: "Account pending approval",
      text: "Your registration is waiting for admin review.",
      variant: "warning",
      time: "Active",
      href: "#/login",
    });
  }

  if (user?.role === "admin") {
    items.push({
      id: "admin-panel",
      title: "Admin access active",
      text: "Manage users and approvals from the Admin Panel.",
      variant: "info",
      time: "Now",
      href: "#/admin",
    });
  }

  if (user?.status === "approved" && user?.accessLevel === "standard" && user?.role !== "admin") {
    items.push({
      id: "roadmap-unlock",
      title: "Unlock full roadmap",
      text: "Step 1 includes 2 free topics with AI lessons. Subscribe to unlock the full roadmap.",
      variant: "accent",
      time: "Upgrade",
      href: "#/roadmap",
    });
  }

  if (user?.status === "approved" && user?.accessLevel === "trial" && user?.role !== "admin") {
    items.push({
      id: "trial-upgrade",
      title: "Upgrade to Premium",
      text: "Your trial includes all Phase 1 lessons. Upgrade to Premium for AI features and full roadmap access.",
      variant: "accent",
      time: "Upgrade",
      href: "#/roadmap",
    });
  }

  const stats = computeStats();

  if (stats.revisionsDue > 0) {
    items.push({
      id: "revisions-due",
      title: `${stats.revisionsDue} review${stats.revisionsDue > 1 ? "s" : ""} due`,
      text: "Spaced repetition problems need your attention.",
      variant: "warning",
      time: "Today",
      href: "#/mission",
    });
  }

  const mission = computeTodaysMission();
  const pending = mission.filter((m) => !m.done);
  if (pending.length > 0) {
    items.push({
      id: "mission-pending",
      title: `${pending.length} mission task${pending.length > 1 ? "s" : ""} remaining`,
      text: "Complete today's mission to stay on track.",
      variant: "accent",
      time: "Today",
      href: "#/mission",
    });
  }

  if (stats.currentStreak > 0) {
    items.push({
      id: "streak-active",
      title: `${stats.currentStreak}-day streak`,
      text: stats.currentStreak >= 7
        ? "Excellent consistency — keep the momentum going."
        : "Solve at least one problem today to extend your streak.",
      variant: "success",
      time: "Today",
      href: "#/dashboard",
    });
  }

  getActivities().slice(0, 10).forEach((activity) => {
    items.push({
      id: `activity-${activity.id}`,
      title: activity.action,
      text: activity.problemTitle || activity.topic || "Learning activity",
      variant: variantForAction(activity.action),
      time: formatRelativeTime(activity.timestamp),
      href: activity.problemId ? "#/problems" : undefined,
    });
  });

  if (!items.length) {
    items.push({
      id: "empty-feed",
      title: "You're all caught up",
      text: "New activity, mission reminders, and updates will appear here.",
      variant: "default",
      time: "Now",
    });
  }

  return items;
}

export function getNotifications() {
  const readIds = new Set(getReadNotificationIds());
  return buildNotificationItems().map((item) => ({
    ...item,
    read: item.id === "empty-feed" ? true : readIds.has(item.id),
  }));
}

export function getUnreadNotificationCount() {
  return getNotifications().filter((n) => !n.read).length;
}