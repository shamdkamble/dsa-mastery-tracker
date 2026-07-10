/**
 * Hash-based SPA router
 */

import { setState } from "./state.js";
import { dispatch } from "./utils.js";
import { pageTitle } from "./constants/branding.js";

const routes = new Map();

/** Settings sub-sections — #/settings/notifications etc. */
export const SETTINGS_SECTION_IDS = new Set([
  "profile",
  "subscription",
  "appearance",
  "notifications",
  "data",
  "about",
]);

export function registerRoute(path, config) {
  routes.set(path, config);
}

export function registerRoutes(routeMap) {
  Object.entries(routeMap).forEach(([path, config]) => {
    registerRoute(path, config);
  });
}

/**
 * Parse #/settings/notifications → { path: "settings", section: "notifications" }
 * Legacy #notifications (broken) → settings + notifications section
 */
export function getHashSearchParams(hash = window.location.hash) {
  const full = (hash || "").replace(/^#\/?/, "");
  const queryIndex = full.indexOf("?");
  if (queryIndex < 0) return new URLSearchParams();
  return new URLSearchParams(full.slice(queryIndex + 1));
}

export function parseRoute(hash = window.location.hash) {
  const raw = (hash || "#/login").replace(/^#\/?/, "").split("?")[0];
  const parts = raw.split("/").filter(Boolean);
  let path = parts[0] || "login";
  let section = parts[1] || null;

  if (SETTINGS_SECTION_IDS.has(path)) {
    section = path;
    path = "settings";
  }

  return { path, section };
}

function getRouteConfig(path) {
  if (routes.has(path)) return routes.get(path);
  return routes.get("dashboard");
}

export function navigate(path) {
  const normalized = path.replace(/^\/?/, "").replace(/^#+\/?/, "");
  window.location.hash = `#/${normalized}`;
}

export function getCurrentPath() {
  return parseRoute().path;
}

export function getCurrentSection() {
  return parseRoute().section;
}

let authGuard = null;

export function setAuthGuard(fn) {
  authGuard = fn;
}

let lastRenderedPath = "";
let lastRenderedHtml = "";

function scrollToSettingsSection(sectionId) {
  if (!sectionId || !SETTINGS_SECTION_IDS.has(sectionId)) return;

  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.querySelectorAll(".settings-nav__item").forEach((item) => {
    const target = item.dataset.settingsSection || "";
    item.classList.toggle("is-active", target === sectionId);
  });
}

async function renderRouteContent(path, container) {
  const config = getRouteConfig(path);

  if (!config) {
    container.innerHTML = `<div class="content-inner"><p>Page not found</p></div>`;
    lastRenderedPath = path;
    lastRenderedHtml = container.innerHTML;
    return null;
  }

  const content = typeof config.render === "function"
    ? await config.render()
    : `<div class="content-inner"><p>Empty page</p></div>`;

  if (
    path === lastRenderedPath
    && content === lastRenderedHtml
    && container.innerHTML === content
  ) {
    return config;
  }

  lastRenderedPath = path;
  lastRenderedHtml = content;
  container.innerHTML = content;

  if (typeof config.onMount === "function") {
    config.onMount(container);
  }

  return config;
}

export async function renderRoute(path, container, { section = null } = {}) {
  if (authGuard) {
    const allowed = await authGuard(path);
    if (!allowed) return;
  }

  const config = await renderRouteContent(path, container);
  if (!config) return;

  setState({ currentRoute: path });
  dispatch("route:change", { path, section, config });
  document.title = pageTitle(config.title);

  if (path === "settings" && section) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToSettingsSection(section));
    });
  }
}

/** Re-render the current page content without auth checks or route events. */
export async function refreshRouteContent(path, container) {
  await renderRouteContent(path, container);
}

export function initRouter(container) {
  const handleRoute = () => {
    const { path, section } = parseRoute();
    renderRoute(path, container, { section });
  };

  window.addEventListener("hashchange", handleRoute);
  handleRoute();

  return () => window.removeEventListener("hashchange", handleRoute);
}