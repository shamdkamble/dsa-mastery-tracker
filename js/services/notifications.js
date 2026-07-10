/**
 * In-app notifications — server access alerts + local activity/mission feed
 */

import { getSessionUser } from "../auth/session.js";
import { getTrialDaysRemaining } from "../auth/access.js";
import { getActivities, getReadNotificationIds, markNotificationRead as markLocalNotificationRead } from "../storage/db.js";
import { computeStats, computeTodaysMission } from "../storage/computed.js";
import { formatRelativeTime } from "../storage/helpers.js";
import {
  fetchServerNotifications,
  markAllServerNotificationsRead,
  markServerNotificationRead,
} from "./notifications-api.js";

/** @type {Array<object>} */
let serverNotificationsCache = [];

export function setServerNotificationsCache(items = []) {
  serverNotificationsCache = Array.isArray(items) ? items : [];
}

export function getServerNotificationsCache() {
  return serverNotificationsCache;
}

function mapServerNotification(item) {
  return {
    id: `access-${item.id}`,
    serverId: item.id,
    source: "server",
    title: item.title,
    text: item.text,
    variant: item.variant || "info",
    time: formatRelativeTime(item.createdAt),
    href: item.href || "#/settings",
    read: Boolean(item.read),
  };
}

function variantForAction(action) {
  if (action === "Solved" || action === "Reviewed") return "success";
  if (action === "Failed attempt") return "danger";
  if (action === "Deleted") return "warning";
  return "default";
}

function buildLocalNotificationItems() {
  const items = [];
  const user = getSessionUser();

  if (user?.status === "pending") {
    items.push({
      id: "auth-pending",
      title: "Account pending approval",
      text: "Your registration is waiting for admin review.",
      variant: "warning",
      time: "Active",
      href: "#/settings",
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
    const days = getTrialDaysRemaining(user);
    const daysLabel = days != null && days > 0 ? `${days} day${days === 1 ? "" : "s"} left · ` : "";
    items.push({
      id: "trial-upgrade",
      title: "Upgrade to Premium",
      text: `${daysLabel}Phase 1 lessons unlocked. Simpler words lock from Step 3. Upgrade for full AI & all phases.`,
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

/**
 * Build the current notification feed (newest contextual items first).
 */
export function buildNotificationItems() {
  const serverItems = serverNotificationsCache.map(mapServerNotification);
  const localItems = buildLocalNotificationItems();
  return [...serverItems, ...localItems];
}

export function getNotifications() {
  const readIds = new Set(getReadNotificationIds());
  return buildNotificationItems().map((item) => ({
    ...item,
    read: item.source === "server"
      ? item.read
      : (item.id === "empty-feed" ? true : readIds.has(item.id)),
  }));
}

export function getUnreadNotificationCount() {
  return getNotifications().filter((n) => !n.read).length;
}

export async function markNotificationReadById(id) {
  if (!id || id === "empty-feed") return;

  if (id.startsWith("access-")) {
    const serverId = id.slice("access-".length);
    try {
      await markServerNotificationRead(serverId);
      serverNotificationsCache = serverNotificationsCache.map((n) => (
        n.id === serverId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.warn("[notifications] mark server read failed:", err?.message || err);
    }
    return;
  }

  markLocalNotificationRead(id);
}

export async function markAllNotificationsReadByIds(ids) {
  const hasServerUnread = ids.some((id) => id.startsWith("access-"))
    || serverNotificationsCache.some((n) => !n.read);

  if (hasServerUnread) {
    try {
      await markAllServerNotificationsRead();
      serverNotificationsCache = serverNotificationsCache.map((n) => ({ ...n, read: true }));
    } catch (err) {
      console.warn("[notifications] mark all server read failed:", err?.message || err);
    }
  }

  const localIds = ids.filter((id) => !id.startsWith("access-"));
  if (localIds.length) {
    const { markAllNotificationsRead } = await import("../storage/db.js");
    markAllNotificationsRead(localIds);
  }
}

/** Prime server notifications on login (used if polling has not run yet). */
export async function hydrateServerNotifications() {
  try {
    const items = await fetchServerNotifications();
    setServerNotificationsCache(items);
  } catch {
    setServerNotificationsCache([]);
  }
}