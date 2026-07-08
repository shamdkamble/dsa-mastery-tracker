/**
 * Subscription upgrade modal — shown when free users hit locked roadmap content
 */

import { icon } from "./icons.js";
import { Button } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";

const MODAL_ID = "upgrade";

let shellReady = false;

function renderModalShell() {
  return `
    <div class="modal-overlay" id="${MODAL_ID}-overlay" data-modal="${MODAL_ID}" aria-hidden="true">
      <div class="modal modal--sm upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="${MODAL_ID}-title">
        <div class="upgrade-modal__hero" aria-hidden="true">
          <div class="upgrade-modal__glow"></div>
          <div class="upgrade-modal__icon">${icon("lock")}</div>
        </div>
        <div class="modal__body upgrade-modal__body">
          <h2 class="upgrade-modal__title" id="${MODAL_ID}-title">Unlock Full DSA Mastery</h2>
          <p class="upgrade-modal__text">
            You've completed Week 1. Subscribe to unlock the complete 12-month roadmap and AI lessons.
          </p>
          <ul class="upgrade-modal__perks">
            <li>${icon("layers")}<span>All 6 phases &amp; 150+ topics</span></li>
            <li>${icon("zap")}<span>Unlimited AI-generated lessons</span></li>
            <li>${icon("target")}<span>FAANG interview prep path</span></li>
          </ul>
        </div>
        <div class="modal__footer upgrade-modal__footer">
          ${Button({ label: "Subscribe Now", variant: "primary", attrs: 'data-action="upgrade-subscribe"' })}
          <button type="button" class="btn btn--ghost" data-modal-close>Maybe later</button>
        </div>
      </div>
    </div>
  `;
}

function ensureUpgradeModalShell() {
  if (shellReady) return;
  shellReady = true;

  document.body.insertAdjacentHTML("beforeend", renderModalShell());
  initModals(document);

  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="upgrade-subscribe"]')) {
      e.preventDefault();
      closeModal(MODAL_ID);
    }
  });
}

export function openUpgradeModal() {
  ensureUpgradeModalShell();
  openModal(MODAL_ID);
}

export function closeUpgradeModal() {
  closeModal(MODAL_ID);
}

export function initUpgradeModal() {
  ensureUpgradeModalShell();
}