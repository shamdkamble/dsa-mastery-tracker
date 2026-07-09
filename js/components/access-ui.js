/**
 * Shared locked-feature UI for subscription tiers
 */

import { icon } from "./icons.js";
import { Button } from "./ui/index.js";

/**
 * @param {{ id?: string, label: string, size?: string, title?: string }} opts
 */
export function renderLockedAiButton({ id, label, size = "sm", title = "Upgrade to Premium to unlock this AI feature" }) {
  return `
    <button
      class="btn btn--ghost btn--${size} access-locked-btn"
      type="button"
      ${id ? `id="${id}"` : ""}
      data-action="upgrade-ai"
      title="${title.replace(/"/g, "&quot;")}"
    >
      ${icon("lock")}
      <span>${label}</span>
    </button>
  `;
}

/**
 * Inline banner shown inside modals when AI is locked.
 * @param {{ title?: string, description?: string, feature?: string }} opts
 */
export function renderAiLockedPanel({
  title = "AI feature locked",
  description = "Upgrade to Premium to unlock AI-generated lessons, pattern detection, complexity analysis, and more.",
  feature = "",
} = {}) {
  return `
    <div class="access-locked-panel">
      <div class="access-locked-panel__icon" aria-hidden="true">${icon("lock")}</div>
      <h3 class="access-locked-panel__title">${title}</h3>
      <p class="access-locked-panel__text">${description}</p>
      ${feature ? `<p class="access-locked-panel__feature">${icon("zap")}<span>${feature}</span></p>` : ""}
      <button type="button" class="btn btn--primary btn--sm access-locked-panel__cta" data-action="upgrade-ai">
        ${icon("zap")}
        <span>Upgrade to Premium</span>
      </button>
    </div>
  `;
}

/**
 * Compact pill badge for locked AI on roadmap cards.
 */
export function renderAiLockBadge() {
  return `<span class="access-lock-badge" title="AI locked — upgrade to Premium">${icon("lock")}<span>AI</span></span>`;
}