/**
 * Progress bar component builder
 */

export function ProgressBar({
  value = 0,
  max = 100,
  label = "",
  showValue = true,
  variant = "",
  size = "",
  striped = false,
  animated = false,
  className = "",
}) {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const barClasses = [
    "progress__bar",
    variant && `progress__bar--${variant}`,
    striped && "progress__bar--striped",
    animated && "progress__bar--animated",
  ].filter(Boolean).join(" ");

  return `
    <div class="progress ${className}">
      ${label || showValue ? `
        <div class="progress__header">
          ${label ? `<span class="progress__label">${label}</span>` : "<span></span>"}
          ${showValue ? `<span class="progress__value">${percent}%</span>` : ""}
        </div>
      ` : ""}
      <div class="progress__track${size === "lg" ? " progress__track--lg" : ""}" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${label || "Progress"}">
        <div class="${barClasses}" style="width: ${percent}%"></div>
      </div>
    </div>
  `;
}

export function ProgressCircle({ value = 0, size = 48, strokeWidth = 3 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return `
    <div class="progress-circle" style="width: ${size}px; height: ${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle class="progress-circle__track" cx="${size / 2}" cy="${size / 2}" r="${radius}" />
        <circle
          class="progress-circle__bar"
          cx="${size / 2}" cy="${size / 2}" r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          style="stroke-width: ${strokeWidth}"
        />
      </svg>
      <span class="progress-circle__label">${value}%</span>
    </div>
  `;
}

export function SegmentedProgress({ total = 5, filled = 0, variant = "" }) {
  const segments = Array.from({ length: total }, (_, i) => {
    const isFilled = i < filled;
    return `<div class="progress__segment${isFilled ? ` is-filled${variant ? ` is-filled--${variant}` : ""}` : ""}"></div>`;
  }).join("");

  return `
    <div class="progress progress--segmented">
      <div class="progress__track">${segments}</div>
    </div>
  `;
}