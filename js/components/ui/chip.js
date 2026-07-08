/**
 * Chip / Tag component builder
 */

import { icon } from "../icons.js";

export function Chip({
  label,
  variant = "",
  selected = false,
  removable = false,
  iconContent = "",
  className = "",
}) {
  const classes = [
    "chip",
    variant && `chip--${variant}`,
    selected && "is-selected",
    className,
  ].filter(Boolean).join(" ");

  const Tag = removable ? "button" : "span";

  return `
    <${Tag} class="${classes}" ${removable ? 'type="button"' : ""}>
      ${iconContent || ""}
      ${label}
      ${removable ? `
        <span class="chip__remove" aria-hidden="true">${icon("close")}</span>
      ` : ""}
    </${Tag}>
  `;
}