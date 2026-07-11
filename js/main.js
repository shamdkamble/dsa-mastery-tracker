/**
 * DSAMantra — Application entry point
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
import { getSubscriptionTier, syncSubscriptionPresentation } from "./subscription-theme.js";
import { initProblemModalTriggers } from "./components/problem-modal.js";
import { initLeetcodeLinks } from "./components/leetcode-actions.js";
import { initTeachModal } from "./components/teach-modal.js";
import { initRecommendProblemsModal } from "./components/recommend-problems-modal.js";
import { setContentContainer } from "./controllers/page-controller.js";
import {
  startLiveNotificationPolling,
  stopLiveNotificationPolling,
  resetLiveNotificationState,
} from "./services/live-notifications.js";
import { hydrateServerNotifications } from "./services/notifications.js";
import { initProductTour, maybeAutoStartTour } from "./components/product-tour.js";
import { initPWA } from "./pwa.js";
import {
  initPushNotifications,
  maybePromptPushEnable,
  syncPushSubscription,
  tryDeliverUnreadAccessPushes,
} from "./push-notifications.js";
import { hydrateNotificationPreferencesFromServer } from "./services/notification-preferences-sync.js";

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
import adminPushLogs from "./pages/admin-push-logs.js";
import adminNotifications from "./pages/admin-notifications.js";
import adminTopicVideos from "./pages/admin-topic-videos.js";
import testingDashboard from "./pages/testing-dashboard.js";
import testingIssues from "./pages/testing-issues.js";
import platformCompass from "./pages/platform-compass.js";
import mentorDesk from "./pages/mentor-desk.js";
import adminMentorInbox from "./pages/admin-mentor-inbox.js";

registerRoutes({
  login,
  register,
  admin,
  "admin-topic-videos": adminTopicVideos,
  "admin-push-logs": adminPushLogs,
  "admin-notifications": adminNotifications,
  "testing-dashboard": testingDashboard,
  "testing-issues": testingIssues,
  "platform-compass": platformCompass,
  "mentor-desk": mentorDesk,
  "admin-mentor-inbox": adminMentorInbox,
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
        role: sessionUser.role === "admin"
          ? "Administrator"
          : sessionUser.role === "tester"
            ? "QA Tester"
            : "DSA Learner",
        authRole: sessionUser.role,
        status: sessionUser.status,
        accessLevel: sessionUser.accessLevel,
        subscriptionTier: getSubscriptionTier(sessionUser),
      },
    });
    syncSubscriptionPresentation(sessionUser);
    return;
  }

  const user = getUser();
  setState({
    user: {
      name: user.name || "Learner",
      initials: getInitials(user.name || "Learner"),
      role: "DSA Learner",
      subscriptionTier: "standard",
    },
  });
  syncSubscriptionPresentation(null);
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
    if (!e.detail?.user) {
      syncSubscriptionPresentation(null);
      stopLiveNotificationPolling();
      resetLiveNotificationState();
      return;
    }
    syncUserFromDB();
    void hydrateServerNotifications().then(() => {
      startLiveNotificationPolling();
    });
    void hydrateNotificationPreferencesFromServer();
    const path = getCurrentPath();
    if (DATA_DRIVEN_ROUTES.has(path)) {
      refreshRouteContent(path, content);
    }
  });
}

async function init() {
  initTheme();
  initPWA();
  initPushNotifications();
  initAuthForms();
  initAppShell();

  const content = $("#content");
  setContentContainer(content);
  bindPageHandlers(content);

  setAuthGuard(enforceRouteAccess);

  const sessionUser = await resolveAuthSession();
  await initDB(sessionUser || getSessionUser());
  syncUserFromDB();
  syncSubscriptionPresentation(sessionUser || getSessionUser());

  initSidebar($("#sidebar"));
  initNavbar($("#navbar"));
  initSidebarOverlay();
  initProblemModalTriggers(document);
  initLeetcodeLinks(document);
  initTeachModal();
  initRecommendProblemsModal();
  initDataRefresh();
  initProductTour();
  initRouter(content);

  if (sessionUser) {
    void hydrateServerNotifications().then(() => {
      startLiveNotificationPolling();
    });
    void hydrateNotificationPreferencesFromServer();
    void syncPushSubscription();
    void tryDeliverUnreadAccessPushes();
    window.setTimeout(() => { void maybePromptPushEnable(); }, 1500);
    maybeAutoStartTour();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => console.error("App init failed:", err));
});