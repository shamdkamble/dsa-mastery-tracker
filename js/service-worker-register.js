/**
 * Shared service worker registration (PWA + Web Push)
 */

let registerPromise = null;

export function ensureAppServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  if (!registerPromise) {
    registerPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => navigator.serviceWorker.ready.then(() => registration))
      .catch((err) => {
        registerPromise = null;
        console.warn("[sw] registration failed:", err);
        throw err;
      });
  }

  return registerPromise;
}