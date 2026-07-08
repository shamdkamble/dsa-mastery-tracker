/**
 * DSA Mastery Tracker — Application entry point
 */

import { initTheme } from "./theme.js";
import { initRouter, registerRoutes, getCurrentPath, renderRoute } from "./router.js";
import { initSidebar } from "./components/sidebar.js";
import { initNavbar } from "./components/navbar.js";
import { getState, setState } from "./state.js";
import { $ } from "./utils.js";
import { initDB, getUser } from "./storage/db.js";
import { getInitials } from "./storage/helpers.js";
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

registerRoutes({
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

function initDataRefresh() {
  const content = $("#content");

  document.addEventListener("data:change", () => {
    syncUserFromDB();
    renderRoute(getCurrentPath(), content);
  });
}

function init() {
  initDB();
  syncUserFromDB();
  initTheme();
  initAppShell();

  const content = $("#content");
  setContentContainer(content);

  initSidebar($("#sidebar"));
  initNavbar($("#navbar"));
  initSidebarOverlay();
  initProblemModalTriggers(document);
  initLeetcodeLinks(document);
  initTeachModal();
  initDataRefresh();
  initRouter(content);
}

document.addEventListener("DOMContentLoaded", init);