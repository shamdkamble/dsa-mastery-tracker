/**
 * Testing panel layout — subnav, hero, stat cards
 */

import { icon } from "./icons.js";

export const TESTING_NAV = [
  { id: "dashboard", path: "testing-dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "issues", path: "testing-issues", label: "Issues", icon: "alertCircle" },
];

export function testingSubnav(active) {
  return `
    <nav class="testing-subnav" aria-label="Testing panel sections">
      ${TESTING_NAV.map((item) => `
        <a href="#/${item.path}" class="testing-subnav__link${active === item.id ? " is-active" : ""}">
          <span class="testing-subnav__icon" aria-hidden="true">${icon(item.icon)}</span>
          <span>${item.label}</span>
        </a>
      `).join("")}
    </nav>
  `;
}

export function testingHero({ title, description, badge = "QA Panel" }) {
  const desc = description
    ? `<p class="testing-hero__desc">${description}</p>`
    : "";

  return `
    <header class="testing-hero">
      <div class="testing-hero__glow" aria-hidden="true"></div>
      <div class="testing-hero__content">
        <div class="testing-hero__top">
          <span class="testing-hero__badge">${icon("target")}<span>${badge}</span></span>
          <h1 class="testing-hero__title">${title}</h1>
        </div>
        ${desc}
      </div>
    </header>
  `;
}

export function testingStatCard({ iconName, value, label, variant = "accent", hint = "" }) {
  return `
    <div class="testing-stat-card testing-stat-card--${variant}">
      <div class="testing-stat-card__icon" aria-hidden="true">${icon(iconName)}</div>
      <div class="testing-stat-card__body">
        <div class="testing-stat-card__value">${value}</div>
        <div class="testing-stat-card__label">${label}</div>
        ${hint ? `<div class="testing-stat-card__hint">${hint}</div>` : ""}
      </div>
    </div>
  `;
}

export function issueStatusBadge(status) {
  const map = {
    pending: { label: "Pending", variant: "warning" },
    in_progress: { label: "In Progress", variant: "accent" },
    fixed: { label: "Fixed — Verify", variant: "info" },
    resolved: { label: "Resolved", variant: "success" },
  };
  const meta = map[status] || { label: status, variant: "default" };
  return `<span class="testing-status testing-status--${meta.variant}">${meta.label}</span>`;
}

export function issueSeverityBadge(severity) {
  const map = {
    low: "default",
    medium: "warning",
    high: "danger",
    critical: "danger",
  };
  const variant = map[severity] || "default";
  const label = severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "—";
  return `<span class="testing-severity testing-severity--${variant}${severity === "critical" ? " testing-severity--pulse" : ""}">${label}</span>`;
}