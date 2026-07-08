/**
 * Hash-based SPA router
 */

import { setState } from "./state.js";
import { dispatch } from "./utils.js";

const routes = new Map();

export function registerRoute(path, config) {
  routes.set(path, config);
}

export function registerRoutes(routeMap) {
  Object.entries(routeMap).forEach(([path, config]) => {
    registerRoute(path, config);
  });
}

function normalizePath(hash) {
  const path = (hash || "#/login").replace(/^#\/?/, "").split("?")[0];
  return path || "login";
}

function getRouteConfig(path) {
  if (routes.has(path)) return routes.get(path);
  return routes.get("dashboard");
}

export function navigate(path) {
  const normalized = path.replace(/^\/?/, "");
  window.location.hash = `#/${normalized}`;
}

export function getCurrentPath() {
  return normalizePath(window.location.hash);
}

let authGuard = null;

export function setAuthGuard(fn) {
  authGuard = fn;
}

let lastRenderedPath = "";
let lastRenderedHtml = "";

async function renderRouteContent(path, container, { animate = true } = {}) {
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

  if (animate) {
    container.classList.remove("animate-fade-in");
    void container.offsetWidth;
    container.classList.add("animate-fade-in");
  }

  if (typeof config.onMount === "function") {
    config.onMount(container);
  }

  return config;
}

export async function renderRoute(path, container) {
  if (authGuard) {
    const allowed = await authGuard(path);
    if (!allowed) return;
  }

  const config = await renderRouteContent(path, container);
  if (!config) return;

  setState({ currentRoute: path });
  dispatch("route:change", { path, config });
  document.title = `${config.title} · DSA Mastery Tracker`;
}

/** Re-render the current page content without auth checks, route events, or animation. */
export async function refreshRouteContent(path, container) {
  await renderRouteContent(path, container, { animate: false });
}

export function initRouter(container) {
  const handleRoute = () => {
    const path = getCurrentPath();
    renderRoute(path, container);
  };

  window.addEventListener("hashchange", handleRoute);
  handleRoute();

  return () => window.removeEventListener("hashchange", handleRoute);
}