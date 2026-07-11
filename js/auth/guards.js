/**
 * Route access control
 */

import { getCurrentPath, navigate } from "../router.js";
import { getSessionUser, isAuthenticated, isAdmin } from "./session.js";
import { fetchMe } from "../services/auth.js";
import { clearSession } from "./session.js";
import { setState } from "../state.js";
import { getInitials } from "../storage/helpers.js";
import { dispatch } from "../utils.js";
import { switchUserContext } from "../storage/db.js";
import { loadRoadmapProgress, resetRoadmapProgress } from "../storage/roadmap-progress.js";
import { getSubscriptionTier, syncSubscriptionPresentation } from "../subscription-theme.js";

export const PUBLIC_ROUTES = new Set(["login", "register"]);
export const ADMIN_ROUTES = new Set(["admin", "admin-topic-videos", "admin-push-logs", "admin-notifications"]);
export const PENDING_USER_ROUTES = new Set(["dashboard", "settings"]);

export function isPendingUser(user) {
  return user?.status === "pending" && user?.role !== "admin";
}

export function isPublicRoute(path) {
  return PUBLIC_ROUTES.has(path);
}

let lastSyncedUserId = null;

export function resetAuthSyncState() {
  lastSyncedUserId = null;
  resetRoadmapProgress();
}

export async function syncAuthState(user) {
  if (!user) return;

  await switchUserContext(user);
  await loadRoadmapProgress();

  const userId = user.id || user.email || null;
  const userChanged = userId !== lastSyncedUserId;
  lastSyncedUserId = userId;

  setState({
    user: {
      name: user.name,
      initials: getInitials(user.name),
      role: user.role === "admin" ? "Administrator" : "DSA Learner",
      authRole: user.role,
      status: user.status,
      accessLevel: user.accessLevel,
      expiresAt: user.expiresAt || null,
      subscriptionTier: getSubscriptionTier(user),
    },
  });

  syncSubscriptionPresentation(user);

  if (userChanged) {
    dispatch("auth:change", { user });
  }
}

export function setAuthShellMode(path) {
  const app = document.getElementById("app");
  if (!app) return;

  const isPublic = isPublicRoute(path);
  app.classList.toggle("app--auth", isPublic);
  app.classList.toggle("app--authenticated", !isPublic && isAuthenticated());
}

export async function resolveAuthSession() {
  if (!isAuthenticated()) return null;

  try {
    const user = await fetchMe();
    await syncAuthState(user);
    return user;
  } catch {
    clearSession();
    return null;
  }
}

export async function enforceRouteAccess(path = getCurrentPath()) {
  setAuthShellMode(path);

  if (isPublicRoute(path)) {
    if (isAuthenticated()) {
      const user = getSessionUser() || await resolveAuthSession();
      if (user) {
        const dest = user.role === "admin" ? "admin" : "dashboard";
        if (path !== dest) navigate(dest);
        setAuthShellMode(dest);
        return path === dest;
      }
    }
    return true;
  }

  let user = getSessionUser();
  if (!user && isAuthenticated()) {
    user = await resolveAuthSession();
  }
  if (!user) {
    navigate("login");
    return false;
  }

  if (ADMIN_ROUTES.has(path) && user.role !== "admin") {
    navigate("dashboard");
    return false;
  }

  if (isPendingUser(user) && !PENDING_USER_ROUTES.has(path)) {
    navigate("dashboard");
    return false;
  }

  return true;
}