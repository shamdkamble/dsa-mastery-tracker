/**
 * Poll for server access notifications and session changes
 */

import { getToken } from "../auth/session.js";
import { fetchMe } from "./auth.js";
import { fetchServerNotifications } from "./notifications-api.js";
import {
  setServerNotificationsCache,
  getServerNotificationsCache,
} from "./notifications.js";
import { syncAuthState } from "../auth/guards.js";
import { syncSubscriptionPresentation } from "../subscription-theme.js";
import { dispatch } from "../utils.js";
import { Toast } from "../components/ui/index.js";
import { showToast } from "../components/ui/interactions.js";

const POLL_MS = 30_000;

let pollTimer = null;
let visibilityBound = false;
let lastAccessSignature = null;
const toastedServerIds = new Set();

function accessSignature(user) {
  if (!user) return null;
  return `${user.id}|${user.status}|${user.accessLevel}|${user.expiresAt || ""}`;
}

function variantToToast(variant) {
  if (variant === "danger") return "danger";
  if (variant === "warning") return "warning";
  if (variant === "success") return "success";
  return "info";
}

function toastServerNotification(item) {
  if (!item || item.read || toastedServerIds.has(item.id)) return;
  toastedServerIds.add(item.id);
  showToast(Toast({
    title: item.title,
    text: item.text,
    variant: variantToToast(item.variant),
  }));
}

export async function refreshLiveNotifications({ toastNew = false } = {}) {
  if (!getToken()) {
    setServerNotificationsCache([]);
    lastAccessSignature = null;
    dispatch("notifications:change");
    return;
  }

  try {
    const [user, serverItems] = await Promise.all([
      fetchMe(),
      fetchServerNotifications(),
    ]);

    const prevSignature = lastAccessSignature;
    const nextSignature = accessSignature(user);
    lastAccessSignature = nextSignature;

    if (prevSignature && prevSignature !== nextSignature) {
      await syncAuthState(user);
      syncSubscriptionPresentation(user);
    }

    const prevIds = new Set(getServerNotificationsCache().map((n) => n.id));
    setServerNotificationsCache(serverItems);
    dispatch("notifications:change");

    if (toastNew) {
      serverItems.forEach((item) => {
        const isNew = !prevIds.has(item.id) && !item.read;
        if (isNew) toastServerNotification(item);
      });
    }
  } catch (err) {
    console.warn("[live-notifications] refresh failed:", err?.message || err);
  }
}

export function startLiveNotificationPolling() {
  stopLiveNotificationPolling();
  void refreshLiveNotifications({ toastNew: false });

  pollTimer = window.setInterval(() => {
    void refreshLiveNotifications({ toastNew: true });
  }, POLL_MS);

  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && getToken()) {
        void refreshLiveNotifications({ toastNew: true });
      }
    });
  }
}

export function stopLiveNotificationPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function resetLiveNotificationState() {
  lastAccessSignature = null;
  toastedServerIds.clear();
}