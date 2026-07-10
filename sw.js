/**
 * DSAMantra service worker — offline shell + static asset caching
 */

const CACHE_VERSION = "dsamantra-v15";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/css/main.css",
  "/js/main.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const OFFLINE_URLS = new Set(PRECACHE_URLS);

function isApiRequest(url) {
  return url.pathname.startsWith("/api");
}

function isStaticAsset(url) {
  return /\.(css|js|svg|png|jpg|jpeg|webp|woff2?|ico|webmanifest|json)$/i.test(url.pathname);
}

function isAppScript(url) {
  return url.pathname.startsWith("/js/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  if (!isStaticAsset(url) && !OFFLINE_URLS.has(url.pathname)) return;

  if (isAppScript(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "DSAMantra",
    body: "You have a new notification.",
    url: "/#/dashboard",
    tag: "dsamantra-notification",
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* use defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "dsamantra-notification",
      renotify: true,
      requireInteraction: false,
      vibrate: [120, 60, 120],
      silent: false,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/#/dashboard";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (!("focus" in client)) continue;
        client.postMessage({ type: "NOTIFICATION_NAVIGATE", url: rawUrl });
        return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});