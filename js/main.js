/**
 * DSA Mastery Tracker — Application entry point
 */

import { initTheme } from "./theme.js";
import { initRouter, registerRoutes, getCurrentPath, refreshRouteContent, setAuthGuard } from "./router.js";
import { enforceRouteAccess, resolveAuthSession } from "./auth/guards.js";
import { initAuthForms } from "./auth/forms.js";
import { initSidebar } from "./components/sidebar.js";
import { initNavbar } from "./components/navbar.js";
import { getState, setState } from "./state.js";
import { $ } from "./utils.js";
import { bindPageHandlers } from "./controllers/page-controller.js";
import { initDB, getUser } from "./storage/db.js";
import { getInitials } from "./storage/helpers.js";
import { getSessionUser } from "./auth/session.js";
import { initProblemModalTriggers } from "./components/problem-modal.js";
import { initLeetcodeLinks } from "./components/leetcode-actions.js";
import { initTeachModal } from "./components/teach-modal.js";
import { setContentContainer } from "./controllers/page-controller.js";

import dashboard from "./pages/dashboard.js";
import mission from "./pages/mission.js";
import problems from "./pages/problems.js";
import patterns from "./pages/patterns.js";
import roadmap from "./pages/roadmap.js";
import analytics from "./pages/analytics.js";
import calendar from "./pages/calendar.js";
import search from "./pages/search.js";
import settings from "./pages/settings.js";
import login from "./pages/login.js";
import register from "./pages/register.js";
import admin from "./pages/admin.js";

registerRoutes({
  login,
  register,
  admin,
  dashboard,
  mission,
  problems,
  patterns,
  roadmap,
  analytics,
  calendar,
  search,
  settings,
});

function syncUserFromDB() {
  const sessionUser = getSessionUser();
  if (sessionUser) {
    setState({
      user: {
        name: sessionUser.name,
        initials: getInitials(sessionUser.name),
        role: sessionUser.role === "admin" ? "Administrator" : "DSA Learner",
        authRole: sessionUser.role,
        status: sessionUser.status,
      },
    });
    return;
  }

  const user = getUser();
  setState({
    user: {
      name: user.name || "Learner",
      initials: getInitials(user.name || "Learner"),
      role: "DSA Learner",
    },
  });
}

function initAppShell() {
  const app = $("#app");
  const { sidebarCollapsed } = getState();

  if (sidebarCollapsed) {
    app.classList.add("sidebar-collapsed");
  }
}

function initSidebarOverlay() {
  const overlay = $("#sidebar-overlay");

  overlay?.addEventListener("click", () => {
    setState({ sidebarOpen: false });
  });

  document.addEventListener("state:change", (e) => {
    const { updates } = e.detail;
    if (updates.sidebarOpen !== undefined) {
      overlay?.classList.toggle("is-visible", updates.sidebarOpen);
      overlay?.setAttribute("aria-hidden", String(!updates.sidebarOpen));
    }
  });
}

const DATA_DRIVEN_ROUTES = new Set([
  "dashboard",
  "mission",
  "problems",
  "patterns",
  "roadmap",
  "analytics",
  "calendar",
  "settings",
  "search",
]);

function initDataRefresh() {
  const content = $("#content");

  document.addEventListener("auth:change", (e) => {
    if (!e.detail?.user) return;
    syncUserFromDB();
    const path = getCurrentPath();
    if (DATA_DRIVEN_ROUTES.has(path)) {
      refreshRouteContent(path, content);
    }
  });
}

async function init() {
  initTheme();
  initAuthForms();
  initAppShell();

  const content = $("#content");
  setContentContainer(content);
  bindPageHandlers(content);

  setAuthGuard(enforceRouteAccess);

  const sessionUser = await resolveAuthSession();
  await initDB(sessionUser || getSessionUser());
  syncUserFromDB();

  initSidebar($("#sidebar"));
  initNavbar($("#navbar"));
  initSidebarOverlay();
  initProblemModalTriggers(document);
  initLeetcodeLinks(document);
  initTeachModal();
  initDataRefresh();
  initRouter(content);
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => console.error("App init failed:", err));
});