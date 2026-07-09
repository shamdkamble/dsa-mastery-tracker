/**
 * Context-aware subscription upgrade modal
 */

import { icon } from "./icons.js";
import { Button } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import { getSessionUser } from "../auth/session.js";
import { hasTrialAccess, getTrialDaysRemaining } from "../auth/access.js";

const MODAL_ID = "upgrade";

/** @type {Record<string, { title: string, text: string, perks: string[] }>} */
const CONTEXTS = {
  content: {
    title: "Unlock the Full Roadmap",
    text: "Subscribe to access all 6 phases, 150+ topics, and the complete FAANG prep path.",
    perks: [
      "All 6 phases & 150+ topics",
      "Unlimited AI-generated lessons",
      "FAANG interview prep path",
    ],
  },
  "ai-lesson": {
    title: "Unlock AI Lessons",
    text: "Get personalized AI lessons for every topic — generated on demand and saved to your library.",
    perks: [
      "AI lessons on every topic",
      "Simpler explanations on demand",
      "Saved lesson library",
    ],
  },
  "ai-features": {
    title: "Unlock AI Features",
    text: "Premium unlocks AI pattern detection, complexity analysis, and smart lesson tools.",
    perks: [
      "Auto-detect problem patterns",
      "Analyze solution complexity",
      "AI lesson regeneration",
    ],
  },
  trial: {
    title: "Upgrade to Premium",
    text: "Your trial includes all Phase 1 topics. Upgrade to unlock AI lessons, pattern detection, and the full roadmap.",
    perks: [
      "Unlimited AI-generated lessons",
      "Auto-detect & complexity analysis",
      "All 6 phases unlocked",
    ],
  },
  standard: {
    title: "Unlock More Topics",
    text: "You're on the free plan with 2 preview topics. Subscribe to unlock the complete roadmap and AI tools.",
    perks: [
      "All Phase 1–6 topics",
      "Unlimited AI lessons",
      "AI problem helpers",
    ],
  },
};

let shellReady = false;
let activeContext = "content";

function resolveContext(context) {
  const user = getSessionUser();
  if (context === "auto") {
    if (hasTrialAccess(user)) return "trial";
    return "standard";
  }
  return CONTEXTS[context] ? context : "content";
}

function renderModalShell() {
  return `
    <div class="modal-overlay" id="${MODAL_ID}-overlay" data-modal="${MODAL_ID}" aria-hidden="true">
      <div class="modal modal--sm upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="${MODAL_ID}-title">
        <div class="upgrade-modal__hero" aria-hidden="true">
          <div class="upgrade-modal__glow"></div>
          <div class="upgrade-modal__icon">${icon("lock")}</div>
        </div>
        <div class="modal__body upgrade-modal__body">
          <h2 class="upgrade-modal__title" id="${MODAL_ID}-title"></h2>
          <p class="upgrade-modal__text" id="${MODAL_ID}-text"></p>
          <ul class="upgrade-modal__perks" id="${MODAL_ID}-perks"></ul>
        </div>
        <div class="modal__footer upgrade-modal__footer">
          ${Button({ label: "Upgrade to Premium", variant: "primary", attrs: 'data-action="upgrade-subscribe"' })}
          <button type="button" class="btn btn--ghost" data-modal-close>Maybe later</button>
        </div>
      </div>
    </div>
  `;
}

function updateModalContent(contextKey) {
  const key = resolveContext(contextKey);
  activeContext = key;
  const ctx = CONTEXTS[key] || CONTEXTS.content;
  const user = getSessionUser();
  let text = ctx.text;

  if (key === "trial") {
    const days = getTrialDaysRemaining(user);
    if (days != null && days > 0) {
      text = `Your ${days}-day trial includes all Phase 1 topics. Upgrade to unlock AI lessons, pattern detection, and the full roadmap.`;
    }
  }

  const titleEl = document.getElementById(`${MODAL_ID}-title`);
  const textEl = document.getElementById(`${MODAL_ID}-text`);
  const perksEl = document.getElementById(`${MODAL_ID}-perks`);

  if (titleEl) titleEl.textContent = ctx.title;
  if (textEl) textEl.textContent = text;
  if (perksEl) {
    perksEl.innerHTML = ctx.perks
      .map((perk) => `<li>${icon("check")}<span>${perk}</span></li>`)
      .join("");
  }
}

function ensureUpgradeModalShell() {
  if (shellReady) return;
  shellReady = true;

  document.body.insertAdjacentHTML("beforeend", renderModalShell());
  initModals(document);
  updateModalContent("content");

  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="upgrade-subscribe"]')) {
      e.preventDefault();
      closeModal(MODAL_ID);
    }
  });
}

/**
 * @param {string} [context] — content | ai-lesson | ai-features | trial | standard | auto
 */
export function openUpgradeModal(context = "content") {
  ensureUpgradeModalShell();
  updateModalContent(context);
  openModal(MODAL_ID);
}

export function closeUpgradeModal() {
  closeModal(MODAL_ID);
}

export function initUpgradeModal() {
  ensureUpgradeModalShell();
}