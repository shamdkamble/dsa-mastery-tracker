/**
 * Top navigation bar component
 */

import { icon } from "./icons.js";
import { getState, setState, subscribe } from "../state.js";
import { toggleTheme } from "../theme.js";
import { navigate } from "../router.js";
import { addSearchRecent } from "../storage/db.js";
import { $, debounce } from "../utils.js";

const ROUTE_TITLES = {
  dashboard: "Dashboard",
  mission: "Today's Mission",
  problems: "Problems",
  patterns: "Patterns",
  roadmap: "FAANG Mastery Roadmap",
  analytics: "Analytics",
  calendar: "Calendar",
  search: "Search",
  settings: "Settings",
};

function renderNavbar(state) {
  const { currentRoute, searchQuery, notifications, user } = state;
  const pageTitle = ROUTE_TITLES[currentRoute] || "Dashboard";

  return `
    <div class="navbar__left">
      <button class="navbar__menu-btn" id="navbar-menu-btn" type="button" aria-label="Open menu" aria-expanded="false">
        ${icon("menu")}
      </button>
      <nav class="navbar__breadcrumb" aria-label="Breadcrumb">
        <span>DSA Mastery</span>
        <span aria-hidden="true">/</span>
        <span class="navbar__breadcrumb-current">${pageTitle}</span>
      </nav>
    </div>

    <div class="navbar__center">
      <div class="search-input-wrapper">
        <span class="search-icon" aria-hidden="true">${icon("search")}</span>
        <input
          type="search"
          class="input search-input"
          id="navbar-search"
          placeholder="Search problems, topics, notes..."
          value="${searchQuery}"
          aria-label="Search"
          autocomplete="off"
        />
        <kbd class="search-shortcut" aria-hidden="true">⌘K</kbd>
      </div>
    </div>

    <div class="navbar__right">
      <button class="btn btn--primary btn--sm" type="button" data-action="add-problem" aria-label="Add new problem">
        ${icon("plus")}
        <span>New</span>
      </button>

      <button class="navbar__action" type="button" aria-label="Toggle theme" title="Toggle theme" id="navbar-theme-toggle">
        <span class="icon-theme-light" aria-hidden="true">${icon("sun")}</span>
        <span class="icon-theme-dark" aria-hidden="true">${icon("moon")}</span>
      </button>

      <button class="navbar__action navbar__action--notifications" type="button" aria-label="Notifications (${notifications} unread)" title="Notifications">
        ${icon("bell")}
        ${notifications > 0 ? '<span class="navbar__notification-dot" aria-hidden="true"></span>' : ""}
      </button>

      <button class="navbar__action" type="button" aria-label="Help" title="Help">
        ${icon("help")}
      </button>

      <button class="navbar__profile" type="button" aria-label="User profile menu" aria-haspopup="true">
        <span class="navbar__profile-avatar" aria-hidden="true">${user.initials}</span>
        <span class="navbar__profile-name">${user.name}</span>
        <span class="navbar__profile-chevron" aria-hidden="true">${icon("chevronDown")}</span>
      </button>
    </div>
  `;
}

function bindEvents(container) {
  const menuBtn = $("#navbar-menu-btn", container);
  menuBtn?.addEventListener("click", () => {
    const { sidebarOpen } = getState();
    setState({ sidebarOpen: !sidebarOpen });
    menuBtn.setAttribute("aria-expanded", String(!sidebarOpen));
  });

  const searchInput = $("#navbar-search", container);
  if (searchInput) {
    const handleSearch = debounce((e) => {
      setState({ searchQuery: e.target.value });
      if (e.target.value.trim()) addSearchRecent(e.target.value);
    }, 200);
    searchInput.addEventListener("input", handleSearch);

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        setState({ searchQuery: "" });
        searchInput.blur();
      }
      if (e.key === "Enter" && searchInput.value.trim()) {
        navigate("search");
      }
    });
  }

  const themeBtn = $("#navbar-theme-toggle", container);
  themeBtn?.addEventListener("click", () => toggleTheme());

  if (!document.body.dataset.shortcutBound) {
    document.body.dataset.shortcutBound = "true";
    document.addEventListener("keydown", handleGlobalShortcut);
  }
}

function handleGlobalShortcut(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    const searchInput = $("#navbar-search");
    if (searchInput) {
      searchInput.focus();
    } else {
      navigate("search");
    }
  }
}

function updateBreadcrumb(container, currentRoute) {
  const breadcrumb = $(".navbar__breadcrumb-current", container);
  if (breadcrumb) {
    breadcrumb.textContent = ROUTE_TITLES[currentRoute] || "Dashboard";
  }
}

export function initNavbar(container) {
  container.innerHTML = renderNavbar(getState());
  bindEvents(container);

  subscribe(({ updates, state }) => {
    if (updates.currentRoute !== undefined) {
      updateBreadcrumb(container, state.currentRoute);
    }
  });
}