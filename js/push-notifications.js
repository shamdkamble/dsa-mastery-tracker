/**
 * Web Push — permission, subscribe/unsubscribe, settings sync
 */

import { getToken } from "./auth/session.js";
import { getSettings, updateNotificationSetting } from "./storage/db.js";
import {
  fetchPushConfig,
  fetchPushStatus,
  removePushSubscription,
  savePushSubscription,
} from "./api/pushApi.js";
import { Toast } from "./components/ui/index.js";
import { showToast } from "./components/ui/interactions.js";

let cachedPublicKey = null;
let activeEndpoint = null;

function supportsPush() {
  return "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

async function getServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.ready;
  return registration;
}

async function getVapidPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  const config = await fetchPushConfig();
  cachedPublicKey = config?.publicKey || null;
  return cachedPublicKey;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function getPushSupportMessage() {
  if (!supportsPush()) {
    return "Push notifications are not supported in this browser.";
  }
  if (isIOS() && !isStandalone()) {
    return "On iPhone, install DSAMantra to your Home Screen first, then enable push notifications.";
  }
  if (Notification.permission === "denied") {
    return "Notifications are blocked. Enable them in your browser or device settings.";
  }
  return "";
}

export async function enableWebPush() {
  if (!getToken()) {
    throw new Error("Sign in to enable push notifications.");
  }

  if (!supportsPush()) {
    throw new Error(getPushSupportMessage() || "Push is not supported.");
  }

  if (isIOS() && !isStandalone()) {
    throw new Error(getPushSupportMessage());
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    throw new Error("Push notifications are not configured on the server yet.");
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error(getPushSupportMessage() || "Notification permission was not granted.");
  }

  const registration = await getServiceWorkerRegistration();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await savePushSubscription(subscription);
  activeEndpoint = subscription.endpoint;
  updateNotificationSetting("pushEnabled", true, { silent: true });
  return subscription;
}

export async function disableWebPush() {
  if (!getToken()) {
    updateNotificationSetting("pushEnabled", false, { silent: true });
    return;
  }

  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    const endpoint = subscription?.endpoint || activeEndpoint;

    if (endpoint) {
      await removePushSubscription(endpoint);
    } else {
      await removePushSubscription();
    }

    await subscription?.unsubscribe();
  } catch (err) {
    console.warn("[push] unsubscribe failed:", err?.message || err);
    await removePushSubscription(activeEndpoint || undefined).catch(() => {});
  } finally {
    activeEndpoint = null;
    updateNotificationSetting("pushEnabled", false, { silent: true });
  }
}

export async function syncPushSubscription() {
  if (!getToken() || !supportsPush()) return;

  const settings = getSettings();
  if (!settings.notifications?.pushEnabled) return;
  if (Notification.permission !== "granted") return;

  try {
    await enableWebPush();
  } catch (err) {
    console.warn("[push] sync failed:", err?.message || err);
  }
}

export async function teardownPushOnLogout() {
  try {
    await disableWebPush();
  } catch {
    updateNotificationSetting("pushEnabled", false, { silent: true });
  }
}

export async function refreshPushStatusLabel(container) {
  const statusEl = container?.querySelector("#push-status-text");
  if (!statusEl) return;

  const supportMessage = getPushSupportMessage();
  if (supportMessage) {
    statusEl.hidden = false;
    statusEl.textContent = supportMessage;
    return;
  }

  if (!getToken()) {
    statusEl.hidden = false;
    statusEl.textContent = "Sign in to enable push notifications.";
    return;
  }

  try {
    const status = await fetchPushStatus();
    if (!status.configured) {
      statusEl.hidden = false;
      statusEl.textContent = "Push is not configured on the server yet.";
      return;
    }

    if (status.subscribed && Notification.permission === "granted") {
      statusEl.hidden = false;
      statusEl.textContent = "Push notifications are active on this device.";
      return;
    }

    if (getSettings().notifications?.pushEnabled) {
      statusEl.hidden = false;
      statusEl.textContent = "Push is enabled in settings but not active on this device yet.";
      return;
    }

    statusEl.hidden = false;
    statusEl.textContent = "Enable push to get alerts when your account is approved.";
  } catch {
    statusEl.hidden = true;
  }
}

export async function handlePushSettingToggle(enabled, toggleEl) {
  try {
    if (enabled) {
      await enableWebPush();
      showToast(Toast({
        title: "Push notifications enabled",
        text: "You will receive alerts for important account updates.",
        variant: "success",
      }));
    } else {
      await disableWebPush();
      showToast(Toast({
        title: "Push notifications disabled",
        variant: "info",
      }));
    }
  } catch (err) {
    if (toggleEl) toggleEl.checked = !enabled;
    updateNotificationSetting("pushEnabled", !enabled, { silent: true });
    showToast(Toast({
      title: "Could not update push notifications",
      text: err?.message || "Try again later.",
      variant: "danger",
    }));
  }
}

function bindNotificationNavigation() {
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type !== "NOTIFICATION_NAVIGATE") return;

    import("./router.js").then(({ navigate }) => {
      const raw = event.data.url || "/#/dashboard";
      const path = raw.replace(/^\/?#\/?/, "") || "dashboard";
      navigate(path);
    });
  });
}

export function initPushNotifications() {
  if (!supportsPush()) return;

  bindNotificationNavigation();

  document.addEventListener("auth:change", (e) => {
    if (e.detail?.user) {
      void syncPushSubscription();
    } else {
      void teardownPushOnLogout();
    }
  });
}