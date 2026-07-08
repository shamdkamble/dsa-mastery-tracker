/**
 * Empty state component builder
 */

import { icon } from "../icons.js";

export function EmptyState({
  title,
  text = "",
  iconName = "grid",
  iconVariant = "",
  actions = "",
  compact = false,
  flat = false,
  className = "",
}) {
  const classes = [
    "empty-state",
    compact && "empty-state--compact",
    flat && "empty-state--flat",
    className,
  ].filter(Boolean).join(" ");

  const iconClasses = [
    "empty-state__icon",
    iconVariant && `empty-state__icon--${iconVariant}`,
  ].filter(Boolean).join(" ");

  return `
    <div class="${classes}">
      <div class="${iconClasses}" aria-hidden="true">${icon(iconName)}</div>
      <h2 class="empty-state__title">${title}</h2>
      ${text ? `<p class="empty-state__text">${text}</p>` : ""}
      ${actions ? `<div class="empty-state__actions">${actions}</div>` : ""}
    </div>
  `;
}