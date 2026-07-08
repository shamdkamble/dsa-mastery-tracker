/**
 * Sidebar navigation component
 */

import { icon } from "./icons.js";
import { getState, setState, subscribe } from "../state.js";
import { navigate } from "../router.js";
import { toggleTheme } from "../theme.js";
import { $, $$, on } from "../utils.js";
import { getProblems } from "../storage/db.js";
import { computeTodaysMission } from "../storage/computed.js";

function getNavSections() {
  const problemCount = getProblems().length;
  const missionCount = computeTodaysMission().length;

  return [
  {
    label: "Overview",
    items: [
      { path: "dashboard", label: "Dashboard", icon: "dashboard" },
      { path: "mission", label: "Today's Mission", icon: "mission", badge: missionCount || null },
      { path: "problems", label: "Problems", icon: "problems", badge: problemCount || null },
      { path: "patterns", label: "Patterns", icon: "patterns" },
      { path: "roadmap", label: "FAANG Mastery Roadmap", icon: "target" },
    ],
  },
  {
    label: "Insights",
    items: [
      { path: "analytics", label: "Analytics", icon: "analytics" },
      { path: "calendar", label: "Calendar", icon: "calendar" },
    ],
  },
  {
    label: "Tools",
    items: [
      { path: "search", label: "Search", icon: "search" },
    ],
  },
];
}

function renderNavLink(item, currentRoute) {
  const isActive = currentRoute === item.path;
  return `
    <a
      href="#/${item.path}"
      class="sidebar__link${isActive ? " is-active" : ""}"
      data-route="${item.path}"
      aria-current="${isActive ? "page" : "false"}"
    >
      <span class="sidebar__link-icon" aria-hidden="true">${icon(item.icon)}</span>
      <span class="sidebar__link-text">${item.label}</span>
      ${item.badge ? `<span class="sidebar__link-badge">${item.badge}</span>` : ""}
    </a>
  `;
}

function renderSidebar(state) {
  const { currentRoute, user } = state;
  const sections = getNavSections().map(
    (section) => `
      <div class="sidebar__section">
        <div class="sidebar__section-label">${section.label}</div>
        ${section.items.map((item) => renderNavLink(item, currentRoute)).join("")}
      </div>
    `
  ).join("");

  return `
    <div class="sidebar__header">
      <a href="#/dashboard" class="sidebar__logo" data-route="dashboard" aria-label="DSA Mastery Tracker home">
        <div class="sidebar__logo-icon" aria-hidden="true">${icon("logo")}</div>
        <div class="sidebar__logo-text">
          <span class="sidebar__logo-title">DSA Mastery</span>
          <span class="sidebar__logo-subtitle">Tracker</span>
        </div>
      </a>
      <button class="sidebar__collapse-btn" id="sidebar-collapse" type="button" aria-label="Collapse sidebar" title="Collapse sidebar">
        ${icon("chevronLeft")}
      </button>
    </div>

    <nav class="sidebar__nav" aria-label="Primary">
      ${sections}
    </nav>

    <div class="sidebar__footer">
      <div class="sidebar__footer-actions">
        <button class="theme-toggle" id="sidebar-theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme">
          <span class="icon-theme-light" aria-hidden="true">${icon("sun")}</span>
          <span class="icon-theme-dark" aria-hidden="true">${icon("moon")}</span>
        </button>
        <a href="#/settings" class="btn btn--ghost btn--icon" data-route="settings" aria-label="Settings" title="Settings">
          ${icon("settings")}
        </a>
        <button class="btn btn--ghost btn--icon" type="button" aria-label="Help" title="Help">
          ${icon("help")}
        </button>
      </div>
      <div class="sidebar__user">
        <div class="sidebar__user-avatar" aria-hidden="true">${user.initials}</div>
        <div class="sidebar__user-info">
          <div class="sidebar__user-name">${user.name}</div>
          <div class="sidebar__user-role">${user.role}</div>
        </div>
      </div>
    </div>
  `;
}

function updateActiveLinks(container, currentRoute) {
  $$(".sidebar__link", container).forEach((link) => {
    const isActive = link.dataset.route === currentRoute;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function syncAppClasses(app, state) {
  app.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  app.classList.toggle("sidebar-open", state.sidebarOpen);
}

export function initSidebar(container) {
  const app = $("#app");

  container.innerHTML = renderSidebar(getState());
  syncAppClasses(app, getState());

  container.addEventListener("click", (e) => {
    const collapseBtn = e.target.closest("#sidebar-collapse");
    if (collapseBtn) {
      const { sidebarCollapsed } = getState();
      setState({ sidebarCollapsed: !sidebarCollapsed });
      return;
    }

    const themeBtn = e.target.closest("#sidebar-theme-toggle");
    if (themeBtn) {
      toggleTheme();
      return;
    }

    const link = e.target.closest("[data-route]");
    if (!link) return;

    e.preventDefault();
    navigate(link.dataset.route);

    if (window.innerWidth <= 768) {
      setState({ sidebarOpen: false });
    }
  });

  subscribe(({ updates, state }) => {
    if (updates.sidebarCollapsed !== undefined || updates.sidebarOpen !== undefined) {
      syncAppClasses(app, state);
    }
    if (updates.currentRoute !== undefined) {
      updateActiveLinks(container, state.currentRoute);
    }
  });

  on("route:change", ({ detail }) => {
    updateActiveLinks(container, detail.path);
  });

  document.addEventListener("data:change", () => {
    container.innerHTML = renderSidebar(getState());
    syncAppClasses(app, getState());
    updateActiveLinks(container, getState().currentRoute);
  });
}