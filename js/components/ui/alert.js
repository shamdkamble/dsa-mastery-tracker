/**
 * Alert & Toast component builders
 */

import { icon } from "../icons.js";

const ALERT_ICONS = {
  info: "info",
  success: "check",
  warning: "alertTriangle",
  danger: "alertCircle",
  default: "info",
};

export function Alert({
  title = "",
  text = "",
  variant = "default",
  dismissible = false,
  className = "",
}) {
  return `
    <div class="alert alert--${variant} ${className}" role="alert">
      <span class="alert__icon" aria-hidden="true">${icon(ALERT_ICONS[variant] || "info")}</span>
      <div class="alert__content">
        ${title ? `<div class="alert__title">${title}</div>` : ""}
        ${text ? `<div class="alert__text">${text}</div>` : ""}
      </div>
      ${dismissible ? `
        <button class="alert__close" type="button" data-alert-close aria-label="Dismiss">
          ${icon("close")}
        </button>
      ` : ""}
    </div>
  `;
}

export function Toast({ title, text = "", variant = "info" }) {
  return `
    <div class="toast toast--${variant}" role="status">
      <span class="toast__icon" aria-hidden="true">${icon(ALERT_ICONS[variant] || "info")}</span>
      <div class="toast__content">
        <div class="toast__title">${title}</div>
        ${text ? `<div class="toast__text">${text}</div>` : ""}
      </div>
    </div>
  `;
}