/**
 * Product tour / walkthrough engine
 */

import { icon } from "./icons.js";
import { getTourSteps } from "./product-tour-steps.js";
import { getCurrentPath, navigate } from "../router.js";
import { getTourState, updateTourState } from "../storage/db.js";
import { getState, setState } from "../state.js";
import { isAuthenticated } from "../auth/session.js";
import { isPublicRoute } from "../auth/guards.js";
import { $ } from "../utils.js";

const SPOTLIGHT_PAD = 8;
const CARD_GAP = 16;
const WAIT_MS = 4000;

let active = false;
let stepIndex = 0;
let steps = [];
let root = null;
let resizeObserver = null;
let scrollHandler = null;

function ensureRoot() {
  if (root) return root;

  root = document.createElement("div");
  root.id = "product-tour-root";
  root.className = "product-tour";
  root.setAttribute("hidden", "");
  root.innerHTML = `
    <div class="product-tour__backdrop" data-tour-action="backdrop"></div>
    <div class="product-tour__spotlight" aria-hidden="true"></div>
    <div
      class="product-tour__card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-tour-title"
      aria-describedby="product-tour-body"
    >
      <div class="product-tour__card-head">
        <div class="product-tour__icon" id="product-tour-icon" aria-hidden="true"></div>
        <button
          type="button"
          class="product-tour__close btn btn--ghost"
          data-tour-action="skip"
          aria-label="Close tour"
        >
          ${icon("close")}
        </button>
      </div>
      <div class="product-tour__progress">
        <div class="product-tour__progress-track">
          <div class="product-tour__progress-bar" id="product-tour-progress"></div>
        </div>
        <span class="product-tour__progress-text" id="product-tour-progress-text"></span>
      </div>
      <h2 class="product-tour__title" id="product-tour-title"></h2>
      <p class="product-tour__body" id="product-tour-body"></p>
      <div class="product-tour__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-tour-action="skip">Skip tour</button>
        <div class="product-tour__nav">
          <button type="button" class="btn btn--secondary btn--sm" data-tour-action="back">Back</button>
          <button type="button" class="btn btn--primary btn--sm" data-tour-action="next">Next</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  root.addEventListener("click", (e) => {
    const action = e.target.closest("[data-tour-action]")?.dataset.tourAction;
    if (!action) return;

    if (action === "next") {
      e.preventDefault();
      goNext();
    } else if (action === "back") {
      e.preventDefault();
      goBack();
    } else if (action === "skip") {
      e.preventDefault();
      dismissTour();
    } else if (action === "backdrop") {
      /* keep tour open on backdrop click */
    }
  });

  return root;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForRoute(path) {
  const current = getCurrentPath();
  if (current === path) {
    return wait(80);
  }

  return new Promise((resolve) => {
    const handler = (e) => {
      if (e.detail?.path === path) {
        document.removeEventListener("route:change", handler);
        wait(120).then(resolve);
      }
    };
    document.addEventListener("route:change", handler);
    navigate(path);
  });
}

async function waitForElement(selector, timeout = WAIT_MS) {
  if (!selector) return null;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await wait(50);
  }
  return null;
}

function prepareSidebar(step) {
  if (!step.expandSidebar) return;

  if (window.innerWidth <= 768) {
    setState({ sidebarOpen: true });
    return;
  }

  const { sidebarCollapsed } = getState();
  if (sidebarCollapsed) {
    setState({ sidebarCollapsed: false });
  }
}

function getSpotlightRect(target, placement) {
  if (!target || placement === "center") return null;

  const rect = target.getBoundingClientRect();
  return {
    top: Math.max(0, rect.top - SPOTLIGHT_PAD),
    left: Math.max(0, rect.left - SPOTLIGHT_PAD),
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  };
}

function positionSpotlight(spotlightEl, backdropEl, rect) {
  if (!rect) {
    spotlightEl.style.display = "none";
    if (backdropEl) backdropEl.style.opacity = "1";
    return;
  }

  if (backdropEl) backdropEl.style.opacity = "0";
  spotlightEl.style.display = "block";
  spotlightEl.style.top = `${rect.top}px`;
  spotlightEl.style.left = `${rect.left}px`;
  spotlightEl.style.width = `${rect.width}px`;
  spotlightEl.style.height = `${rect.height}px`;
}

function positionCard(cardEl, rect, placement) {
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  cardEl.classList.remove(
    "product-tour__card--center",
    "product-tour__card--top",
    "product-tour__card--bottom",
    "product-tour__card--left",
    "product-tour__card--right",
  );

  if (!rect || placement === "center") {
    cardEl.classList.add("product-tour__card--center");
    cardEl.style.top = "";
    cardEl.style.left = "";
    cardEl.style.right = "";
    cardEl.style.bottom = "";
    cardEl.style.transform = "";
    return;
  }

  const cardRect = cardEl.getBoundingClientRect();
  let top = 0;
  let left = 0;
  let resolvedPlacement = placement;

  const fitsBelow = rect.top + rect.height + CARD_GAP + cardRect.height < vh - margin;
  const fitsAbove = rect.top - CARD_GAP - cardRect.height > margin;
  const fitsRight = rect.left + rect.width + CARD_GAP + cardRect.width < vw - margin;
  const fitsLeft = rect.left - CARD_GAP - cardRect.width > margin;

  if (placement === "bottom" && !fitsBelow && fitsAbove) resolvedPlacement = "top";
  if (placement === "top" && !fitsAbove && fitsBelow) resolvedPlacement = "bottom";
  if (placement === "right" && !fitsRight && fitsLeft) resolvedPlacement = "left";
  if (placement === "left" && !fitsLeft && fitsRight) resolvedPlacement = "right";

  if (resolvedPlacement === "bottom") {
    top = rect.top + rect.height + CARD_GAP;
    left = rect.left + rect.width / 2 - cardRect.width / 2;
    cardEl.classList.add("product-tour__card--bottom");
  } else if (resolvedPlacement === "top") {
    top = rect.top - CARD_GAP - cardRect.height;
    left = rect.left + rect.width / 2 - cardRect.width / 2;
    cardEl.classList.add("product-tour__card--top");
  } else if (resolvedPlacement === "right") {
    top = rect.top + rect.height / 2 - cardRect.height / 2;
    left = rect.left + rect.width + CARD_GAP;
    cardEl.classList.add("product-tour__card--right");
  } else if (resolvedPlacement === "left") {
    top = rect.top + rect.height / 2 - cardRect.height / 2;
    left = rect.left - CARD_GAP - cardRect.width;
    cardEl.classList.add("product-tour__card--left");
  }

  left = Math.max(margin, Math.min(left, vw - cardRect.width - margin));
  top = Math.max(margin, Math.min(top, vh - cardRect.height - margin));

  cardEl.style.top = `${top}px`;
  cardEl.style.left = `${left}px`;
  cardEl.style.right = "";
  cardEl.style.bottom = "";
  cardEl.style.transform = "";
}

function scrollTargetIntoView(target) {
  if (!target) return;
  target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function bindReposition(target, step) {
  unbindReposition();

  const reposition = () => {
    if (!active) return;
    const spotlightEl = $(".product-tour__spotlight", root);
    const backdropEl = $(".product-tour__backdrop", root);
    const cardEl = $(".product-tour__card", root);
    if (!spotlightEl || !cardEl) return;
    const rect = getSpotlightRect(target, step.placement);
    positionSpotlight(spotlightEl, backdropEl, rect);
    positionCard(cardEl, rect, step.placement);
  };

  scrollHandler = reposition;
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);

  if (target && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(reposition);
    resizeObserver.observe(target);
  }

  reposition();
}

function unbindReposition() {
  if (scrollHandler) {
    window.removeEventListener("resize", scrollHandler);
    window.removeEventListener("scroll", scrollHandler, true);
    scrollHandler = null;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
}

function renderStepUI(step, index) {
  const iconEl = $("#product-tour-icon", root);
  const titleEl = $("#product-tour-title", root);
  const bodyEl = $("#product-tour-body", root);
  const progressEl = $("#product-tour-progress", root);
  const progressTextEl = $("#product-tour-progress-text", root);
  const backBtn = $('[data-tour-action="back"]', root);
  const nextBtn = $('[data-tour-action="next"]', root);

  if (iconEl) iconEl.innerHTML = icon(step.icon || "info");
  if (titleEl) titleEl.textContent = step.title;
  if (bodyEl) bodyEl.textContent = step.body;

  const pct = Math.round(((index + 1) / steps.length) * 100);
  if (progressEl) progressEl.style.width = `${pct}%`;
  if (progressTextEl) progressTextEl.textContent = `Step ${index + 1} of ${steps.length}`;

  if (backBtn) backBtn.disabled = index === 0;
  if (nextBtn) {
    nextBtn.textContent = index === steps.length - 1 ? "Finish" : "Next";
  }

  root?.setAttribute("aria-label", `Tour: ${step.title}`);
}

async function showStep(index) {
  const step = steps[index];
  if (!step) return;

  stepIndex = index;
  prepareSidebar(step);

  if (step.route) {
    await waitForRoute(step.route);
  }

  let target = null;
  if (step.target) {
    target = await waitForElement(step.target);
    if (target) {
      scrollTargetIntoView(target);
      await wait(80);
    }
  }

  renderStepUI(step, index);

  const spotlightEl = $(".product-tour__spotlight", root);
  const backdropEl = $(".product-tour__backdrop", root);
  const cardEl = $(".product-tour__card", root);
  const rect = getSpotlightRect(target, step.placement);

  positionSpotlight(spotlightEl, backdropEl, rect);
  positionCard(cardEl, rect, step.placement);

  requestAnimationFrame(() => {
    positionCard(cardEl, getSpotlightRect(target, step.placement), step.placement);
    bindReposition(target, step);
  });

  if (target) {
    target.classList.add("product-tour__target");
    root.dataset.tourTarget = step.id;
  } else {
    root.dataset.tourTarget = step.placement === "center" ? "center" : "missing";
  }
}

function clearTargetHighlight() {
  document.querySelectorAll(".product-tour__target").forEach((el) => {
    el.classList.remove("product-tour__target");
  });
}

function openTourUI() {
  ensureRoot();
  root.removeAttribute("hidden");
  document.body.classList.add("tour-active");
  active = true;
}

function closeTourUI() {
  unbindReposition();
  clearTargetHighlight();
  root?.setAttribute("hidden", "");
  document.body.classList.remove("tour-active");
  active = false;

  if (window.innerWidth <= 768) {
    setState({ sidebarOpen: false });
  }
}

export function isTourActive() {
  return active;
}

export function dismissTour() {
  if (!active) return;
  updateTourState({ dismissed: true });
  closeTourUI();
}

function completeTour() {
  updateTourState({ completed: true, dismissed: false });
  closeTourUI();
}

export async function startTour({ fromStep = 0 } = {}) {
  if (!isAuthenticated() || isPublicRoute(getCurrentPath())) return;
  if (active) return;

  steps = getTourSteps();
  stepIndex = Math.max(0, Math.min(fromStep, steps.length - 1));

  openTourUI();
  await showStep(stepIndex);
}

export function stopTour() {
  if (!active) return;
  closeTourUI();
}

async function goNext() {
  if (stepIndex >= steps.length - 1) {
    completeTour();
    return;
  }
  clearTargetHighlight();
  await showStep(stepIndex + 1);
}

async function goBack() {
  if (stepIndex <= 0) return;
  clearTargetHighlight();
  await showStep(stepIndex - 1);
}

export function initProductTour() {
  ensureRoot();

  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Escape") {
      e.preventDefault();
      dismissTour();
    }
  });

  document.addEventListener("route:change", () => {
    const navbar = $(".navbar");
    navbar?.classList.remove("navbar--help-open");
  });
}

export function maybeAutoStartTour() {
  if (!isAuthenticated()) return;

  const { completed, dismissed } = getTourState();
  if (completed || dismissed) return;

  const path = getCurrentPath();
  if (isPublicRoute(path)) return;

  window.setTimeout(() => {
    if (!isTourActive()) {
      void startTour({ fromStep: 0 });
    }
  }, 900);
}