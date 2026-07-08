/**
 * Avatar component builder
 */

export function Avatar({
  initials = "",
  src = "",
  alt = "",
  size = "md",
  square = false,
  interactive = false,
  className = "",
}) {
  const classes = [
    "avatar",
    `avatar--${size}`,
    square && "avatar--square",
    interactive && "avatar--interactive",
    className,
  ].filter(Boolean).join(" ");

  if (src) {
    return `<div class="${classes}"><img src="${src}" alt="${alt || initials}"></div>`;
  }

  return `<div class="${classes}" aria-label="${alt || initials}">${initials}</div>`;
}

export function AvatarGroup(avatars = []) {
  return `
    <div class="avatar-group">
      ${avatars.map((a) => Avatar({ ...a, size: a.size || "sm" })).join("")}
    </div>
  `;
}