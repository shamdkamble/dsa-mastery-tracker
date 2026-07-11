/**
 * Sidebar navigation component
 */

import { icon } from "./icons.js";
import { getState, setState, subscribe } from "../state.js";
import { navigate } from "../router.js";
import { $, $$, on, debounce } from "../utils.js";
import { getProblems } from "../storage/db.js";
import { computeTodaysMission } from "../storage/computed.js";
import { isAdmin } from "../auth/session.js";
import { BRAND } from "../constants/branding.js";

function escapeAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
        { path: "settings", label: "Profile & Settings", icon: "user" },
      ],
    },
    ...(isAdmin() ? [{
      label: "Administration",
      items: [
        { path: "admin", label: "Admin Panel", icon: "shield" },
        { path: "admin-topic-videos", label: "Topic Videos", icon: "video" },
        { path: "admin-push-logs", label: "Push Delivery Log", icon: "bell" },
        { path: "admin-notifications", label: "System Architecture", icon: "layers" },
      ],
    }] : []),
  ];
}

function renderNavLink(item, currentRoute) {
  const isActive = currentRoute === item.path;
  return `
    <a
      href="#/${item.path}"
      class="sidebar__link${isActive ? " is-active" : ""}"
      data-route="${item.path}"
      data-tooltip="${escapeAttr(item.label)}"
      aria-current="${isActive ? "page" : "false"}"
    >
      <span class="sidebar__link-icon" aria-hidden="true">${icon(item.icon)}</span>
      <span class="sidebar__link-text">${item.label}</span>
      ${item.badge ? `<span class="sidebar__link-badge">${item.badge}</span>` : ""}
    </a>
  `;
}

function renderSidebar(state) {
  const { currentRoute } = state;

  const sections = getNavSections().map(
    (section) => `
      <div class="sidebar__section">
        <div class="sidebar__section-label">${section.label}</div>
        ${section.items.map((item) => renderNavLink(item, currentRoute)).join("")}
      </div>
    `,
  ).join("");

  return `
    <div class="sidebar__header">
      <a href="#/dashboard" class="sidebar__logo" data-route="dashboard" data-tooltip="${escapeAttr(BRAND.name)}" aria-label="${escapeAttr(BRAND.name)} home">
        <div class="sidebar__logo-icon" aria-hidden="true">${icon("logo")}</div>
        <div class="sidebar__logo-text">
          <span class="sidebar__logo-title">${BRAND.name}</span>
          <span class="sidebar__logo-subtitle">${BRAND.sidebarSubtitle}</span>
        </div>
      </a>
      <button class="sidebar__collapse-btn" id="sidebar-collapse" type="button" aria-label="Collapse sidebar" title="Collapse sidebar">
        ${icon("chevronLeft")}
      </button>
    </div>

    <nav class="sidebar__nav" aria-label="Primary" data-tour="sidebar-nav">
      ${sections}
    </nav>
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

function updateCollapseButton(container, collapsed) {
  const btn = $("#sidebar-collapse", container);
  if (!btn) return;
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
  btn.setAttribute("aria-expanded", String(!collapsed));
}

export function initSidebar(container) {
  const app = $("#app");

  container.innerHTML = renderSidebar(getState());
  syncAppClasses(app, getState());
  updateCollapseButton(container, getState().sidebarCollapsed);

  container.addEventListener("click", (e) => {
    const collapseBtn = e.target.closest("#sidebar-collapse");
    if (collapseBtn) {
      const { sidebarCollapsed } = getState();
      setState({ sidebarCollapsed: !sidebarCollapsed });
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
      if (updates.sidebarCollapsed !== undefined) {
        updateCollapseButton(container, state.sidebarCollapsed);
      }
    }
    if (updates.currentRoute !== undefined) {
      updateActiveLinks(container, state.currentRoute);
    }
  });

  on("route:change", ({ detail }) => {
    updateActiveLinks(container, detail.path);
  });

  function updateSidebarBadges() {
    const problemCount = getProblems().length;
    const missionCount = computeTodaysMission().length;

    const missionLink = container.querySelector('[data-route="mission"]');
    const problemsLink = container.querySelector('[data-route="problems"]');

    [missionLink, problemsLink].forEach((link) => {
      if (!link) return;
      let badge = link.querySelector(".sidebar__link-badge");
      const count = link.dataset.route === "mission" ? missionCount : problemCount;
      if (count > 0) {
        if (!badge) {
          link.insertAdjacentHTML(
            "beforeend",
            `<span class="sidebar__link-badge">${count}</span>`,
          );
        } else {
          badge.textContent = String(count);
        }
      } else {
        badge?.remove();
      }
    });
  }

  const refreshSidebarBadges = debounce(updateSidebarBadges, 200);
  document.addEventListener("data:change", refreshSidebarBadges);

  document.addEventListener("auth:change", () => {
    container.innerHTML = renderSidebar(getState());
    syncAppClasses(app, getState());
    updateCollapseButton(container, getState().sidebarCollapsed);
    updateActiveLinks(container, getState().currentRoute);
  });
}