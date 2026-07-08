/**
 * Badge component builder
 */

export function Badge({
  label,
  variant = "default",
  size = "",
  dot = false,
  icon = "",
  interactive = false,
  className = "",
}) {
  const classes = [
    "badge",
    `badge--${variant}`,
    size && `badge--${size}`,
    dot && "badge--dot",
    interactive && "badge--interactive",
    className,
  ].filter(Boolean).join(" ");

  return `
    <span class="${classes}">
      ${icon || ""}
      ${label}
    </span>
  `;
}

export function DifficultyBadge(level) {
  const map = { easy: "easy", medium: "medium", hard: "hard" };
  const variant = map[level?.toLowerCase()] || "default";
  return Badge({ label: level, variant });
}