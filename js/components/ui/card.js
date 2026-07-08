/**
 * Card component builder
 */

export function Card({
  title = "",
  subtitle = "",
  body = "",
  footer = "",
  variant = "",
  className = "",
  headerAction = "",
  attrs = "",
}) {
  const classes = ["card", variant && `card--${variant}`, className].filter(Boolean).join(" ");

  return `
    <div class="${classes}" ${attrs}>
      ${title || subtitle || headerAction ? `
        <div class="card__header">
          <div>
            ${title ? `<h3 class="card__title">${title}</h3>` : ""}
            ${subtitle ? `<p class="card__subtitle">${subtitle}</p>` : ""}
          </div>
          ${headerAction || ""}
        </div>
      ` : ""}
      ${body ? `<div class="card__body">${body}</div>` : ""}
      ${footer ? `<div class="card__footer">${footer}</div>` : ""}
    </div>
  `;
}

export function StatCard({ label, value, change, changeType = "up", icon = "" }) {
  return `
    <div class="stat-card">
      ${icon ? `<div class="stat-card__icon" aria-hidden="true">${icon}</div>` : ""}
      <div class="stat-card__label">${label}</div>
      <div class="stat-card__value">${value}</div>
      ${change ? `<div class="stat-card__change stat-card__change--${changeType}">${change}</div>` : ""}
    </div>
  `;
}