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

const IOS_INSTALL_MESSAGE = "For iOS users: Open the app from Home Screen, then enable notifications in Settings.";

let cachedPublicKey = null;
let activeEndpoint = null;
let settingsUiBound = false;

function supportsPush() {
  return "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

export function getPushEnvironment() {
  const signedIn = Boolean(getToken());
  const ios = isIOSDevice();
  const standalone = isStandaloneMode();

  return {
    supportsPush: supportsPush(),
    isIOS: ios,
    isStandalone: standalone,
    iosNeedsInstall: ios && !standalone,
    permission: supportsPush() ? Notification.permission : "unsupported",
    signedIn,
    canEnablePush: supportsPush()
      && signedIn
      && (!ios || standalone)
      && Notification.permission !== "denied",
  };
}

async function ensureServiceWorkerReady() {
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

async function getServiceWorkerRegistration() {
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.ready;
  }
  return ensureServiceWorkerReady();
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
  const env = getPushEnvironment();

  if (!env.supportsPush) {
    return "Push notifications are not supported in this browser.";
  }
  if (env.iosNeedsInstall) {
    return IOS_INSTALL_MESSAGE;
  }
  if (env.permission === "denied") {
    return "Notifications are blocked. Open iOS Settings → DSAMantra → Notifications and allow alerts.";
  }
  if (!env.signedIn) {
    return "Sign in to enable push notifications.";
  }
  return "";
}

function getIosPermissionHint() {
  if (!isIOSDevice() || !isStandaloneMode()) return "";
  if (Notification.permission === "granted") return "";
  if (Notification.permission === "denied") {
    return "Notifications are blocked. Open iOS Settings → DSAMantra → Notifications to allow alerts.";
  }
  return "Turn on the toggle below — iOS will ask you to allow notifications.";
}

export async function enableWebPush() {
  const env = getPushEnvironment();

  if (!env.signedIn) {
    throw new Error("Sign in to enable push notifications.");
  }

  if (!env.supportsPush) {
    throw new Error(getPushSupportMessage() || "Push is not supported.");
  }

  if (env.iosNeedsInstall) {
    throw new Error(IOS_INSTALL_MESSAGE);
  }

  // Request permission early while the user gesture is still active (critical on iOS).
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    const deniedMsg = isIOSDevice()
      ? "Notification permission was not granted. You can enable alerts later in iOS Settings."
      : "Notification permission was not granted.";
    throw new Error(deniedMsg);
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    throw new Error("Push notifications are not configured on the server yet.");
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
  const env = getPushEnvironment();
  if (!env.signedIn || !env.supportsPush || env.iosNeedsInstall) return;

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

function setPushToggleState(container, { enabled, checked }) {
  const toggle = container?.querySelector('[data-setting="notif.pushEnabled"]');
  if (!toggle) return;

  toggle.disabled = !enabled;
  toggle.setAttribute("aria-disabled", String(!enabled));
  toggle.checked = Boolean(checked);
  toggle.closest(".settings-row")?.classList.toggle("settings-row--disabled", !enabled);
}

function setIosCalloutVisibility(container) {
  const callout = container?.querySelector("#push-ios-callout");
  if (!callout) return;

  const show = getPushEnvironment().iosNeedsInstall;
  callout.hidden = !show;
}

export async function refreshPushStatusLabel(container) {
  const statusEl = container?.querySelector("#push-status-text");
  if (!statusEl) return;

  const env = getPushEnvironment();
  const supportMessage = getPushSupportMessage();

  if (supportMessage) {
    statusEl.hidden = false;
    statusEl.textContent = supportMessage;
    return;
  }

  const iosHint = getIosPermissionHint();
  if (iosHint) {
    statusEl.hidden = false;
    statusEl.textContent = iosHint;
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

export async function bindPushSettingsUI(container) {
  if (!container) return;

  const env = getPushEnvironment();
  setIosCalloutVisibility(container);

  const pushEnabled = Boolean(getSettings().notifications?.pushEnabled);
  const isActive = pushEnabled && Notification.permission === "granted";

  setPushToggleState(container, {
    enabled: env.canEnablePush,
    checked: isActive || (pushEnabled && env.canEnablePush),
  });

  if (env.canEnablePush) {
    void getVapidPublicKey().catch(() => {});
  }

  await refreshPushStatusLabel(container);
}

export async function handlePushSettingToggle(enabled, toggleEl) {
  const container = toggleEl?.closest(".settings-card") || document;

  if (enabled && getPushEnvironment().iosNeedsInstall) {
    if (toggleEl) toggleEl.checked = false;
    showToast(Toast({
      title: "Install DSAMantra first",
      text: IOS_INSTALL_MESSAGE,
      variant: "warning",
    }));
    await bindPushSettingsUI(container);
    return;
  }

  try {
    if (enabled) {
      await enableWebPush();
      showToast(Toast({
        title: "Push notifications enabled",
        text: isIOSDevice()
          ? "You will receive alerts from DSAMantra on this device."
          : "You will receive alerts for important account updates.",
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
  } finally {
    await bindPushSettingsUI(container);
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

function bindGlobalPushUiRefresh() {
  if (settingsUiBound) return;
  settingsUiBound = true;

  window.matchMedia("(display-mode: standalone)").addEventListener("change", () => {
    const section = document.getElementById("notifications");
    if (section) void bindPushSettingsUI(section.closest(".settings-card")?.parentElement || document);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const section = document.getElementById("notifications");
    if (section) void bindPushSettingsUI(section.closest(".settings-card")?.parentElement || document);
  });
}

export function initPushNotifications() {
  bindGlobalPushUiRefresh();

  if (!supportsPush()) return;

  bindNotificationNavigation();

  document.addEventListener("auth:change", (e) => {
    if (e.detail?.user) {
      void syncPushSubscription();
    } else {
      void teardownPushOnLogout();
    }

    const section = document.getElementById("notifications");
    if (section) void bindPushSettingsUI(section.closest(".settings-card")?.parentElement || document);
  });
}