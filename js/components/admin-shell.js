/**
 * Shared admin layout — subnav, hero, stat cards
 */

import { icon } from "./icons.js";

export const ADMIN_NAV = [
  { id: "users", path: "admin", label: "Users", icon: "user" },
  { id: "push-logs", path: "admin-push-logs", label: "Push Log", icon: "bell" },
  { id: "notifications", path: "admin-notifications", label: "System Architecture", icon: "layers" },
];

export function adminSubnav(active) {
  return `
    <nav class="admin-subnav" aria-label="Admin sections">
      ${ADMIN_NAV.map((item) => `
        <a href="#/${item.path}" class="admin-subnav__link${active === item.id ? " is-active" : ""}">
          <span class="admin-subnav__icon" aria-hidden="true">${icon(item.icon)}</span>
          <span>${item.label}</span>
        </a>
      `).join("")}
    </nav>
  `;
}

export function adminHero({ title, description, badge = "Admin" }) {
  const desc = description
    ? `<p class="admin-hero__desc">${description}</p>`
    : "";

  return `
    <header class="admin-hero">
      <div class="admin-hero__glow" aria-hidden="true"></div>
      <div class="admin-hero__content">
        <div class="admin-hero__top">
          <span class="admin-hero__badge">${icon("shield")}<span>${badge}</span></span>
          <h1 class="admin-hero__title">${title}</h1>
        </div>
        ${desc}
      </div>
    </header>
  `;
}

export function adminStatCard({ iconName, value, label, variant = "accent" }) {
  return `
    <div class="card admin-stat-card admin-stat-card--${variant}">
      <div class="card__body admin-stat-card__body">
        <div class="admin-stat-card__icon" aria-hidden="true">${icon(iconName)}</div>
        <div>
          <div class="admin-stat-card__value">${value}</div>
          <div class="admin-stat-card__label">${label}</div>
        </div>
      </div>
    </div>
  `;
}

export function adminQuickCard({ path, iconName, title, text, accent = "accent" }) {
  return `
    <a href="#/${path}" class="card admin-quick-card admin-quick-card--${accent}" data-route="${path}">
      <div class="card__body admin-quick-card__body">
        <div class="admin-quick-card__icon" aria-hidden="true">${icon(iconName)}</div>
        <div class="admin-quick-card__text">
          <div class="admin-quick-card__title">${title}</div>
          <p class="admin-quick-card__desc">${text}</p>
        </div>
        <span class="admin-quick-card__arrow" aria-hidden="true">${icon("chevronLeft")}</span>
      </div>
    </a>
  `;
}