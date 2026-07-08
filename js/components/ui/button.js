/**
 * Button component builder
 */

export function Button({
  label = "",
  variant = "primary",
  size = "",
  icon = "",
  iconRight = "",
  type = "button",
  disabled = false,
  loading = false,
  className = "",
  attrs = "",
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size && `btn--${size}`,
    loading && "is-loading",
    disabled && "is-disabled",
    className,
  ].filter(Boolean).join(" ");

  return `
    <button type="${type}" class="${classes}" ${disabled ? "disabled" : ""} ${attrs}>
      ${icon ? `<span aria-hidden="true">${icon}</span>` : ""}
      ${label ? `<span>${label}</span>` : ""}
      ${iconRight ? `<span aria-hidden="true">${iconRight}</span>` : ""}
    </button>
  `;
}