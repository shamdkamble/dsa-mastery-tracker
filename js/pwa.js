/**
 * PWA install prompt + service worker registration
 */

import { icon } from "./components/icons.js";
import { ensureAppServiceWorker } from "./service-worker-register.js";

const DISMISS_KEY = "dsa-pwa-install-dismissed";
const DISMISS_SESSION_KEY = "dsa-pwa-install-dismissed-session";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const MOBILE_PROMPT_DELAY_MS = 500;

let deferredPrompt = null;
let installUi = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent);
}

function isMobileDevice() {
  const ua = window.navigator.userAgent || "";
  if (/android|iphone|ipad|ipod|mobile/i.test(ua)) return true;
  return window.matchMedia("(max-width: 768px)").matches && navigator.maxTouchPoints > 0;
}

/** Keep installed mobile PWAs in portrait (manifest + runtime lock). */
function lockPortraitOrientation() {
  if (!isMobileDevice()) return;

  const applyLock = async () => {
    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock("portrait-primary");
      }
    } catch {
      /* Requires installed PWA on some platforms; manifest handles the rest. */
    }
  };

  void applyLock();

  window.addEventListener("orientationchange", () => {
    void applyLock();
  }, { passive: true });
}

function wasDismissedRecently() {
  try {
    if (isMobileDevice() && sessionStorage.getItem(DISMISS_SESSION_KEY) === "1") {
      return true;
    }

    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number.parseInt(raw, 10);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS;
  } catch {
    return false;
  }
}

function dismissInstallPrompt() {
  try {
    if (isMobileDevice()) {
      sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  } catch {
    /* ignore */
  }
  installUi?.remove();
  installUi = null;
}

function getInstallCopy({ hasNativePrompt = false } = {}) {
  if (isIOS()) {
    return {
      title: "Install DSAMantra",
      hint: "Add the app to your home screen for the full experience and push notifications.",
      steps: [
        "Tap the Share button in Safari (square with arrow).",
        "Scroll down and tap Add to Home Screen.",
        "Tap Add in the top-right corner.",
      ],
      showInstallButton: false,
    };
  }

  if (isAndroid() && hasNativePrompt) {
    return {
      title: "Install DSAMantra",
      hint: "Install the app for faster access, offline support, and system notifications.",
      steps: [],
      showInstallButton: true,
    };
  }

  if (isAndroid()) {
    return {
      title: "Install DSAMantra",
      hint: "Add the app to your home screen from the browser menu.",
      steps: [
        "Tap the menu (three dots) in Chrome.",
        "Choose Install app or Add to Home screen.",
        "Confirm Install.",
      ],
      showInstallButton: false,
    };
  }

  return {
    title: "Install DSAMantra",
    hint: "Add to your home screen for quick access and offline support.",
    steps: isMobileDevice()
      ? ["Open your browser menu and choose Add to Home Screen or Install."]
      : [],
    showInstallButton: hasNativePrompt,
  };
}

function bindInstallActions(root) {
  root.querySelector("#pwa-install-btn")?.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;

    if (outcome === "accepted") {
      dismissInstallPrompt();
    }
  });

  root.querySelector("#pwa-install-dismiss")?.addEventListener("click", () => {
    dismissInstallPrompt();
  });

  root.querySelector("#pwa-install-later")?.addEventListener("click", () => {
    dismissInstallPrompt();
  });
}

function renderInstallMarkup({ mobile = false, hasNativePrompt = false } = {}) {
  const copy = getInstallCopy({ hasNativePrompt });
  const stepsHtml = copy.steps.length
    ? `<ol class="pwa-install-steps">${copy.steps.map((step) => `<li>${step}</li>`).join("")}</ol>`
    : "";

  if (mobile) {
    return `
      <div class="pwa-install-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
        <div class="pwa-install-modal__backdrop" id="pwa-install-dismiss"></div>
        <div class="pwa-install-modal__card">
          <div class="pwa-install-modal__hero">
            <img src="/icons/icon-192.png" width="72" height="72" alt="" class="pwa-install-modal__icon" />
            <h2 class="pwa-install-modal__title" id="pwa-install-title">${copy.title}</h2>
            <p class="pwa-install-modal__text">${copy.hint}</p>
          </div>
          ${stepsHtml}
          <div class="pwa-install-modal__actions">
            ${copy.showInstallButton ? `
              <button type="button" class="btn btn--primary" id="pwa-install-btn">
                ${icon("download")}
                <span>Install app</span>
              </button>
            ` : ""}
            <button type="button" class="btn btn--ghost" id="pwa-install-later">Continue in browser</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <aside class="pwa-install" role="region" aria-label="Install DSAMantra">
      <div class="pwa-install__icon" aria-hidden="true">
        <img src="/icons/icon-192.png" width="40" height="40" alt="" />
      </div>
      <div class="pwa-install__copy">
        <p class="pwa-install__title">${copy.title}</p>
        <p class="pwa-install__text">${copy.hint}</p>
      </div>
      <div class="pwa-install__actions">
        ${copy.showInstallButton ? `
          <button type="button" class="btn btn--primary btn--sm" id="pwa-install-btn">
            ${icon("download")}
            <span>Install</span>
          </button>
        ` : ""}
        <button type="button" class="btn btn--ghost btn--sm pwa-install__close" id="pwa-install-dismiss" aria-label="Dismiss install prompt">
          ${icon("close")}
        </button>
      </div>
    </aside>
  `;
}

function showInstallPrompt({ forceMobile = false } = {}) {
  if (installUi || isStandalone() || wasDismissedRecently()) return;

  const mobile = forceMobile || isMobileDevice();
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderInstallMarkup({
    mobile,
    hasNativePrompt: Boolean(deferredPrompt),
  }).trim();

  installUi = wrapper.firstElementChild;
  if (!installUi) return;

  document.body.appendChild(installUi);
  document.body.classList.toggle("pwa-install-modal-open", mobile);
  bindInstallActions(installUi);
}

function refreshInstallPrompt() {
  if (!installUi || isStandalone()) return;
  const mobile = installUi.classList.contains("pwa-install-modal");
  const wasOpen = Boolean(installUi);
  if (!wasOpen) return;

  installUi.remove();
  installUi = null;
  document.body.classList.remove("pwa-install-modal-open");
  showInstallPrompt({ forceMobile: mobile });
}

export function isPwaInstallPromptVisible() {
  return Boolean(installUi);
}

export function initPWA() {
  void ensureAppServiceWorker();

  if (isStandalone()) {
    lockPortraitOrientation();
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installUi) {
      refreshInstallPrompt();
    } else {
      showInstallPrompt();
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    dismissInstallPrompt();
    document.body.classList.remove("pwa-install-modal-open");
  });

  if (isMobileDevice()) {
    window.setTimeout(() => {
      if (!isStandalone()) showInstallPrompt({ forceMobile: true });
    }, MOBILE_PROMPT_DELAY_MS);
  }
}