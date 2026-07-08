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
  const path = (hash || "#/dashboard").replace(/^#\/?/, "").split("?")[0];
  return path || "dashboard";
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

export async function renderRoute(path, container) {
  if (authGuard) {
    const allowed = await authGuard(path);
    if (!allowed) return;
  }

  const config = getRouteConfig(path);

  if (!config) {
    container.innerHTML = `<div class="content-inner"><p>Page not found</p></div>`;
    return;
  }

  setState({ currentRoute: path });

  const content = typeof config.render === "function"
    ? await config.render()
    : `<div class="content-inner"><p>Empty page</p></div>`;

  container.innerHTML = content;
  container.classList.remove("animate-fade-in");
  void container.offsetWidth;
  container.classList.add("animate-fade-in");

  dispatch("route:change", { path, config });

  if (typeof config.onMount === "function") {
    config.onMount(container);
  }

  document.title = `${config.title} · DSA Mastery Tracker`;
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