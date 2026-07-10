/**
 * PWA install prompt + service worker registration
 */

import { icon } from "./components/icons.js";

const DISMISS_KEY = "dsa-pwa-install-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

let deferredPrompt = null;
let installBanner = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number.parseInt(raw, 10);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS;
  } catch {
    return false;
  }
}

function dismissInstallBanner() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  installBanner?.remove();
  installBanner = null;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function createInstallBanner({ iosHint = false } = {}) {
  if (installBanner || isStandalone() || wasDismissedRecently()) return;

  const hint = iosHint
    ? "Tap Share, then choose Add to Home Screen."
    : "Add to your home screen for quick access and offline support.";

  installBanner = document.createElement("aside");
  installBanner.className = "pwa-install";
  installBanner.setAttribute("role", "region");
  installBanner.setAttribute("aria-label", "Install DSAMantra");
  installBanner.innerHTML = `
    <div class="pwa-install__icon" aria-hidden="true">
      <img src="/icons/icon-192.png" width="40" height="40" alt="" />
    </div>
    <div class="pwa-install__copy">
      <p class="pwa-install__title">Install DSAMantra</p>
      <p class="pwa-install__text">${hint}</p>
    </div>
    <div class="pwa-install__actions">
      ${iosHint ? "" : `
        <button type="button" class="btn btn--primary btn--sm" id="pwa-install-btn">
          ${icon("download")}
          <span>Install</span>
        </button>
      `}
      <button type="button" class="btn btn--ghost btn--sm pwa-install__close" id="pwa-install-dismiss" aria-label="Dismiss install prompt">
        ${icon("close")}
      </button>
    </div>
  `;

  document.body.appendChild(installBanner);

  document.getElementById("pwa-install-btn")?.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;

    if (outcome === "accepted") {
      installBanner?.remove();
      installBanner = null;
    }
  });

  document.getElementById("pwa-install-dismiss")?.addEventListener("click", () => {
    dismissInstallBanner();
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("Service worker registration failed:", err));
  });
}

export function initPWA() {
  registerServiceWorker();

  if (isStandalone()) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    createInstallBanner();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installBanner?.remove();
    installBanner = null;
  });

  if (isIOS()) {
    window.setTimeout(() => {
      if (!deferredPrompt) createInstallBanner({ iosHint: true });
    }, 2400);
  }
}