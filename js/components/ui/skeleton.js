/**
 * Skeleton loading component builder
 */

export function Skeleton({ variant = "text", className = "", width = "", height = "" }) {
  const style = [width && `width:${width}`, height && `height:${height}`].filter(Boolean).join(";");
  return `<div class="skeleton skeleton--${variant} ${className}" ${style ? `style="${style}"` : ""} aria-hidden="true"></div>`;
}

export function SkeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-row mb-4">
        ${Skeleton({ variant: "avatar" })}
        <div class="skeleton-group flex-1">
          ${Skeleton({ variant: "text-lg", width: "40%" })}
          ${Skeleton({ variant: "text-sm", width: "60%" })}
        </div>
      </div>
      ${Skeleton({ variant: "text" })}
      ${Skeleton({ variant: "text", width: "80%" })}
    </div>
  `;
}

export function SkeletonList({ rows = 4 }) {
  return `
    <div class="skeleton-list">
      ${Array.from({ length: rows }, () => Skeleton({ variant: "row" })).join("")}
    </div>
  `;
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return `
    <div class="skeleton-card">
      <div class="skeleton-row mb-4">
        ${Array.from({ length: cols }, () => Skeleton({ variant: "text", width: `${100 / cols}%` })).join("")}
      </div>
      ${SkeletonList({ rows })}
    </div>
  `;
}