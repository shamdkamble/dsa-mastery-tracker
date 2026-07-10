/**
 * Top navigation bar component
 */

import { icon } from "./icons.js";
import { getState, setState, subscribe } from "../state.js";
import { toggleTheme } from "../theme.js";
import { navigate } from "../router.js";
import { addSearchRecent, getUser } from "../storage/db.js";
import { logout } from "../services/auth.js";
import { renderProfileAvatar } from "../utils/profile-avatar.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationReadById,
  markAllNotificationsReadByIds,
} from "../services/notifications.js";
import { $, debounce } from "../utils.js";
import { getSessionUser } from "../auth/session.js";
import { renderSubscriptionBadge, getSubscriptionTier } from "../subscription-theme.js";
import { BRAND } from "../constants/branding.js";
import { startTour } from "./product-tour.js";

const MOBILE_NAV_QUERY = "(max-width: 768px)";
const NAVBAR_PANEL_IDS = ["navbar-help-menu", "navbar-notif-panel", "navbar-profile-menu"];

let portaledPanelSyncBound = false;

function isMobileNavbar() {
  return window.matchMedia(MOBILE_NAV_QUERY).matches;
}

function getNavbarPanelAnchor(panel) {
  if (!panel) return null;
  if (panel.id === "navbar-help-menu") return $(".navbar__help-wrap");
  if (panel.id === "navbar-notif-panel") return $(".navbar__notif-wrap");
  if (panel.id === "navbar-profile-menu") return $(".navbar__profile-wrap");
  return null;
}

function syncPortaledNavbarPanel(panel) {
  if (!panel?.classList.contains("navbar-panel--portaled")) return;

  const navbar = $(".navbar");
  if (!navbar) return;

  const rect = navbar.getBoundingClientRect();
  const side = Math.max(16, Number.parseFloat(getComputedStyle(navbar).paddingLeft)) || 16;

  panel.style.top = `${rect.bottom}px`;
  panel.style.left = `${side}px`;
  panel.style.right = `${side}px`;
  panel.style.width = "auto";
}

function portalNavbarPanel(panel) {
  if (!panel || !isMobileNavbar() || panel.classList.contains("navbar-panel--portaled")) return;

  const anchor = getNavbarPanelAnchor(panel);
  if (!anchor) return;

  document.body.appendChild(panel);
  panel.classList.add("navbar-panel--portaled");
  syncPortaledNavbarPanel(panel);
  bindPortaledPanelSync();
}

function restoreNavbarPanel(panel) {
  if (!panel?.classList.contains("navbar-panel--portaled")) return;

  const anchor = getNavbarPanelAnchor(panel);
  panel.classList.remove("navbar-panel--portaled");
  panel.style.top = "";
  panel.style.left = "";
  panel.style.right = "";
  panel.style.width = "";
  anchor?.appendChild(panel);
}

function bindPortaledPanelSync() {
  if (portaledPanelSyncBound) return;
  portaledPanelSyncBound = true;

  const syncOpenPanels = () => {
    NAVBAR_PANEL_IDS.forEach((id) => {
      const panel = document.getElementById(id);
      if (panel && !panel.hasAttribute("hidden")) {
        syncPortaledNavbarPanel(panel);
      }
    });
  };

  window.addEventListener("resize", syncOpenPanels);
  document.getElementById("content")?.addEventListener("scroll", syncOpenPanels, { passive: true });
}

const ROUTE_TITLES = {
  dashboard: "Dashboard",
  mission: "Today's Mission",
  problems: "Problems",
  patterns: "Patterns",
  roadmap: "FAANG Mastery Roadmap",
  analytics: "Analytics",
  calendar: "Calendar",
  search: "Search",
  settings: "Profile & Settings",
  login: "Sign In",
  register: "Create Account",
  admin: "Admin Panel",
  "admin-push-logs": "Push Delivery Log",
  "admin-notifications": "System Architecture",
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderNotificationItem(item) {
  return `
    <button
      type="button"
      class="navbar-notif__item${item.read ? " is-read" : ""}"
      data-notif-id="${escapeHtml(item.id)}"
      data-notif-href="${item.href ? escapeHtml(item.href) : ""}"
    >
      <span class="navbar-notif__item-dot" aria-hidden="true"></span>
      <span class="navbar-notif__item-body">
        <span class="navbar-notif__item-title">${escapeHtml(item.title)}</span>
        <span class="navbar-notif__item-text">${escapeHtml(item.text)}</span>
      </span>
      <span class="navbar-notif__item-time">${escapeHtml(item.time)}</span>
    </button>
  `;
}

function renderNotificationPanel() {
  const items = getNotifications();
  const unread = items.filter((n) => !n.read).length;

  return `
    <div class="navbar-notif__panel" id="navbar-notif-panel" role="region" aria-label="Notifications" hidden>
      <div class="navbar-notif__head">
        <div>
          <h3 class="navbar-notif__title">Notifications</h3>
          <p class="navbar-notif__subtitle">${unread ? `${unread} unread` : "All caught up"}</p>
        </div>
        <div class="navbar-notif__head-actions">
          ${unread > 0 ? `
            <button type="button" class="btn btn--ghost btn--sm" id="navbar-notif-mark-all">
              Mark all read
            </button>
          ` : ""}
          <button
            type="button"
            class="btn btn--ghost navbar-notif__close"
            id="navbar-notif-close"
            aria-label="Close notifications"
          >
            ${icon("close")}
          </button>
        </div>
      </div>
      <div class="navbar-notif__list">
        ${items.map(renderNotificationItem).join("")}
      </div>
    </div>
  `;
}

function renderNavbar(state) {
  const { currentRoute, searchQuery, notifications, user } = state;
  const pageTitle = ROUTE_TITLES[currentRoute] || "Dashboard";
  const badge = notifications > 0
    ? `<span class="navbar__notification-badge" aria-hidden="true">${notifications > 9 ? "9+" : notifications}</span>`
    : "";
  const subBadge = renderSubscriptionBadge();
  const tier = user.subscriptionTier || getSubscriptionTier(getSessionUser());
  const isPremium = tier === "premium";

  return `
    <div class="navbar__left">
      <button class="navbar__menu-btn" id="navbar-menu-btn" type="button" aria-label="Open menu" aria-expanded="false">
        ${icon("menu")}
      </button>
      <nav class="navbar__breadcrumb" aria-label="Breadcrumb">
        <span>${BRAND.name}</span>
        <span aria-hidden="true">/</span>
        <span class="navbar__breadcrumb-current">${pageTitle}</span>
      </nav>
      <span class="navbar__mobile-title" aria-hidden="false">${pageTitle}</span>
    </div>

    <div class="navbar__center"${currentRoute === "dashboard" ? " hidden" : ""}>
      <div class="search-input-wrapper" data-tour="search">
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
      <button
        class="btn btn--primary btn--sm navbar__new-btn"
        type="button"
        data-action="add-problem"
        data-tour="add-problem"
        aria-label="Add new problem"
      >
        ${icon("plus")}
        <span>New</span>
      </button>

      <div class="navbar__tool-group" role="group" aria-label="Quick actions">
        <button
          class="navbar__action"
          type="button"
          aria-label="Toggle theme"
          title="Toggle theme"
          id="navbar-theme-toggle"
        >
          <span class="icon-theme-light" aria-hidden="true">${icon("sun")}</span>
          <span class="icon-theme-dark" aria-hidden="true">${icon("moon")}</span>
        </button>

        <div class="navbar__notif-wrap">
          <button
            class="navbar__action navbar__action--notifications"
            type="button"
            id="navbar-notif-btn"
            aria-label="Notifications (${notifications} unread)"
            aria-expanded="false"
            aria-controls="navbar-notif-panel"
            title="Notifications"
          >
            ${icon("bell")}
            ${badge}
          </button>
          ${renderNotificationPanel()}
        </div>

        <div class="navbar__help-wrap" data-tour="help">
          <button
            class="navbar__action navbar__action--help"
            type="button"
            id="navbar-help-btn"
            aria-label="Help and info"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="navbar-help-menu"
            title="Help"
          >
            ${icon("help")}
          </button>
          <div class="navbar-help-menu" id="navbar-help-menu" role="menu" hidden>
            <button
              type="button"
              class="navbar-help-menu__item"
              role="menuitem"
              data-help-action="guide"
            >
              ${icon("mission")}
              <span>Guide me</span>
            </button>
            <button
              type="button"
              class="navbar-help-menu__item"
              role="menuitem"
              data-help-action="shortcuts"
            >
              ${icon("zap")}
              <span>Keyboard shortcuts</span>
            </button>
          </div>
        </div>
      </div>

      <div class="navbar__profile-wrap">
        ${subBadge ? `<div class="navbar__profile-badge" data-subscription-badge>${subBadge}</div>` : ""}
        <button
          class="navbar__profile${isPremium ? " navbar__profile--premium" : ""}"
          type="button"
          id="navbar-profile-btn"
          aria-label="User profile menu"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-controls="navbar-profile-menu"
        >
          ${renderProfileAvatar(getUser(), user, "navbar__profile-avatar")}
          <span class="navbar__profile-name">${escapeHtml(user.name)}</span>
          <span class="navbar__profile-chevron" aria-hidden="true">${icon("chevronDown")}</span>
        </button>
        <div class="navbar-profile-menu" id="navbar-profile-menu" role="menu" hidden>
          <div class="navbar-profile-menu__head">
            ${renderProfileAvatar(getUser(), user, "navbar-profile-menu__avatar")}
            <div class="navbar-profile-menu__meta">
              <span class="navbar-profile-menu__name">${escapeHtml(user.name)}</span>
              <span class="navbar-profile-menu__role">${escapeHtml(user.role || "DSA Learner")}</span>
            </div>
          </div>
          ${subBadge ? `<div class="navbar-profile-menu__badge">${subBadge}</div>` : ""}
          <div class="navbar-profile-menu__actions">
            <button type="button" class="navbar-profile-menu__item" role="menuitem" data-profile-action="settings">
              ${icon("user")}
              <span>Profile &amp; Settings</span>
            </button>
            <button type="button" class="navbar-profile-menu__item" role="menuitem" data-profile-action="notifications">
              ${icon("bell")}
              <span>Notifications</span>
            </button>
            <button type="button" class="navbar-profile-menu__item" role="menuitem" data-profile-action="theme">
              ${icon("palette")}
              <span>Toggle theme</span>
            </button>
            <button type="button" class="navbar-profile-menu__item navbar-profile-menu__item--danger" role="menuitem" data-profile-action="logout">
              ${icon("logOut")}
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeHelpMenu(container) {
  const btn = $("#navbar-help-btn", container);
  const menu = document.getElementById("navbar-help-menu");
  menu?.setAttribute("hidden", "");
  restoreNavbarPanel(menu);
  btn?.setAttribute("aria-expanded", "false");
  container.classList.remove("navbar--help-open");
}

function openHelpMenu(container) {
  closeNotificationPanel(container);
  closeProfileMenu(container);
  const btn = $("#navbar-help-btn", container);
  const menu = document.getElementById("navbar-help-menu");
  menu?.removeAttribute("hidden");
  portalNavbarPanel(menu);
  syncPortaledNavbarPanel(menu);
  btn?.setAttribute("aria-expanded", "true");
  container.classList.add("navbar--help-open");
}

function closeProfileMenu(container) {
  const btn = $("#navbar-profile-btn", container);
  const menu = document.getElementById("navbar-profile-menu");
  menu?.setAttribute("hidden", "");
  restoreNavbarPanel(menu);
  btn?.setAttribute("aria-expanded", "false");
  container.classList.remove("navbar--profile-open");
}

function openProfileMenu(container) {
  closeHelpMenu(container);
  closeNotificationPanel(container);
  const btn = $("#navbar-profile-btn", container);
  const menu = document.getElementById("navbar-profile-menu");
  menu?.removeAttribute("hidden");
  portalNavbarPanel(menu);
  syncPortaledNavbarPanel(menu);
  btn?.setAttribute("aria-expanded", "true");
  container.classList.add("navbar--profile-open");
}

function refreshProfileChrome(container) {
  const { user } = getState();
  const profile = getUser();
  const btn = $("#navbar-profile-btn", container);
  if (!btn) return;

  const avatarSlot = btn.querySelector(".navbar__profile-avatar--photo, .navbar__profile-avatar--initials, .navbar__profile-avatar");
  if (avatarSlot) {
    avatarSlot.outerHTML = renderProfileAvatar(profile, user, "navbar__profile-avatar");
  }

  const nameEl = $(".navbar__profile-name", btn);
  if (nameEl) nameEl.textContent = user.name;

  const menuAvatar = $(".navbar-profile-menu__avatar, .navbar-profile-menu__avatar--photo, .navbar-profile-menu__avatar--initials", container);
  if (menuAvatar) {
    menuAvatar.outerHTML = renderProfileAvatar(profile, user, "navbar-profile-menu__avatar");
  }

  const menuName = $(".navbar-profile-menu__name", container);
  if (menuName) menuName.textContent = user.name;
}

function closeNotificationPanel(container) {
  const btn = $("#navbar-notif-btn", container);
  const panel = document.getElementById("navbar-notif-panel");
  panel?.setAttribute("hidden", "");
  restoreNavbarPanel(panel);
  btn?.setAttribute("aria-expanded", "false");
  container.classList.remove("navbar--notif-open");
}

function openNotificationPanel(container) {
  const btn = $("#navbar-notif-btn", container);
  const panel = document.getElementById("navbar-notif-panel");
  panel?.removeAttribute("hidden");
  portalNavbarPanel(panel);
  syncPortaledNavbarPanel(panel);
  btn?.setAttribute("aria-expanded", "true");
  container.classList.add("navbar--notif-open");
  refreshNotificationUI(container);
}

function refreshNotificationUI(container) {
  const count = getUnreadNotificationCount();
  if (getState().notifications !== count) {
    setState({ notifications: count });
  }

  const btn = $("#navbar-notif-btn", container);
  const wrap = $(".navbar__notif-wrap", container);
  if (!btn || !wrap) return;

  btn.setAttribute("aria-label", `Notifications (${count} unread)`);

  let badge = $(".navbar__notification-badge", btn);
  if (count > 0) {
    if (!badge) {
      btn.insertAdjacentHTML(
        "beforeend",
        `<span class="navbar__notification-badge" aria-hidden="true">${count > 9 ? "9+" : count}</span>`,
      );
    } else {
      badge.textContent = count > 9 ? "9+" : String(count);
    }
  } else {
    badge?.remove();
  }

  const panel = document.getElementById("navbar-notif-panel");
  if (!panel || panel.hasAttribute("hidden")) return;

  const wasPortaled = panel.classList.contains("navbar-panel--portaled");
  panel.outerHTML = renderNotificationPanel();
  const newPanel = document.getElementById("navbar-notif-panel");
  newPanel?.removeAttribute("hidden");
  if (wasPortaled) {
    portalNavbarPanel(newPanel);
    syncPortaledNavbarPanel(newPanel);
  }
  bindNotificationPanelEvents();
}

function handleNotificationPanelInteraction(e) {
  const panel = document.getElementById("navbar-notif-panel");
  if (!panel || panel.hasAttribute("hidden")) return;

  const target = e.target instanceof Element ? e.target : e.target?.parentElement;
  if (!target || !panel.contains(target)) return;

  const container = $(".navbar");
  if (!container) return;

  const closeBtn = target.closest("#navbar-notif-close");
  if (closeBtn) {
    e.preventDefault();
    e.stopPropagation();
    closeNotificationPanel(container);
    return;
  }

  const markAll = target.closest("#navbar-notif-mark-all");
  if (markAll) {
    e.preventDefault();
    e.stopPropagation();
    const ids = getNotifications().filter((n) => !n.read).map((n) => n.id);
    void markAllNotificationsReadByIds(ids).then(() => refreshNotificationUI(container));
    return;
  }

  const item = target.closest("[data-notif-id]");
  if (!item) return;

  e.preventDefault();
  e.stopPropagation();

  const id = item.dataset.notifId;
  const href = item.dataset.notifHref;
  void markNotificationReadById(id).then(() => refreshNotificationUI(container));

  if (href) {
    closeNotificationPanel(container);
    const path = href.replace(/^#\/?/, "");
    navigate(path);
  }
}

function bindNotificationPanelEvents() {
  if (document.body.dataset.notifPanelBound) return;
  document.body.dataset.notifPanelBound = "true";

  document.addEventListener("click", handleNotificationPanelInteraction, true);
  document.addEventListener("touchend", handleNotificationPanelInteraction, true);
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

  const notifBtn = $("#navbar-notif-btn", container);
  notifBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("navbar-notif-panel");
    const isOpen = panel && !panel.hasAttribute("hidden");
    if (isOpen) {
      closeNotificationPanel(container);
    } else {
      openNotificationPanel(container);
    }
  });

  bindNotificationPanelEvents();

  const helpBtn = $("#navbar-help-btn", container);
  helpBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById("navbar-help-menu");
    const isOpen = menu && !menu.hasAttribute("hidden");
    if (isOpen) closeHelpMenu(container);
    else openHelpMenu(container);
  });

  $("#navbar-help-menu", container)?.addEventListener("click", (e) => {
    const action = e.target.closest("[data-help-action]")?.dataset.helpAction;
    if (!action) return;
    closeHelpMenu(container);
    if (action === "guide") {
      void startTour({ fromStep: 0 });
    } else if (action === "shortcuts") {
      window.alert("Keyboard shortcuts:\n\nCtrl+K or ⌘K — Focus search\nEsc — Close panels and menus");
    }
  });

  const profileBtn = $("#navbar-profile-btn", container);
  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById("navbar-profile-menu");
    const isOpen = menu && !menu.hasAttribute("hidden");
    if (isOpen) closeProfileMenu(container);
    else openProfileMenu(container);
  });

  $("#navbar-profile-menu", container)?.addEventListener("click", (e) => {
    const action = e.target.closest("[data-profile-action]")?.dataset.profileAction;
    if (!action) return;
    closeProfileMenu(container);
    if (action === "settings") navigate("settings");
    else if (action === "notifications") navigate("settings/notifications");
    else if (action === "theme") toggleTheme();
    else if (action === "logout") {
      logout();
      navigate("login");
    }
  });

  if (!document.body.dataset.notifDismissBound) {
    document.body.dataset.notifDismissBound = "true";
    document.addEventListener("click", (e) => {
      const navbar = $(".navbar");
      if (!navbar?.classList.contains("navbar--notif-open")) return;
      if (e.target.closest(".navbar__notif-wrap, #navbar-notif-panel")) return;
      closeNotificationPanel(navbar);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const navbar = $(".navbar");
      if (navbar) {
        closeNotificationPanel(navbar);
        closeProfileMenu(navbar);
        closeHelpMenu(navbar);
      }
    });
    document.addEventListener("click", (e) => {
      const navbar = $(".navbar");
      if (!navbar?.classList.contains("navbar--profile-open")) return;
      if (e.target.closest(".navbar__profile-wrap, #navbar-profile-menu")) return;
      closeProfileMenu(navbar);
    });
    document.addEventListener("click", (e) => {
      const navbar = $(".navbar");
      if (!navbar?.classList.contains("navbar--help-open")) return;
      if (e.target.closest(".navbar__help-wrap, #navbar-help-menu")) return;
      closeHelpMenu(navbar);
    });
  }

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
  const title = ROUTE_TITLES[currentRoute] || "Dashboard";
  const breadcrumb = $(".navbar__breadcrumb-current", container);
  if (breadcrumb) breadcrumb.textContent = title;

  const mobileTitle = $(".navbar__mobile-title", container);
  if (mobileTitle) mobileTitle.textContent = title;

  const searchCenter = $(".navbar__center", container);
  const hideSearch = currentRoute === "dashboard";
  if (searchCenter) {
    searchCenter.toggleAttribute("hidden", hideSearch);
  }
  container.classList.toggle("navbar--no-search", hideSearch);
}

export function refreshNavbarNotifications() {
  const container = $(".navbar");
  if (container) refreshNotificationUI(container);
}

export function initNavbar(container) {
  setState({ notifications: getUnreadNotificationCount() });
  container.innerHTML = renderNavbar(getState());
  bindEvents(container);
  updateBreadcrumb(container, getState().currentRoute);

  subscribe(({ updates, state }) => {
    if (updates.currentRoute !== undefined) {
      updateBreadcrumb(container, state.currentRoute);
    }
  });

  const refresh = debounce(() => refreshNotificationUI(container), 200);
  document.addEventListener("data:change", refresh);
  document.addEventListener("notifications:change", refresh);

  document.addEventListener("route:change", () => {
    closeNotificationPanel(container);
    closeProfileMenu(container);
    closeHelpMenu(container);
  });

  document.addEventListener("data:change", debounce(() => refreshProfileChrome(container), 150));

  document.addEventListener("auth:change", () => {
    closeNotificationPanel(container);
    closeProfileMenu(container);
    closeHelpMenu(container);
    container.innerHTML = renderNavbar(getState());
    bindEvents(container);
    refreshNotificationUI(container);
  });
}