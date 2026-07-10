/**
 * Product tour — direct element highlight + anchored tooltip
 */

import { icon } from "./icons.js";
import { getTourSteps } from "./product-tour-steps.js";
import { getCurrentPath, navigate } from "../router.js";
import { getTourState, updateTourState } from "../storage/db.js";
import { getState, setState } from "../state.js";
import { isAuthenticated } from "../auth/session.js";
import { isPublicRoute } from "../auth/guards.js";
import { $ } from "../utils.js";

const TOOLTIP_GAP = 14;
const VIEWPORT_PAD = 12;
const NAVBAR_PAD = 64;
const MOBILE_DOCK_QUERY = "(max-width: 640px)";
const DOCKED_TOOLTIP_RESERVE = 200;
const WAIT_MS = 4000;

let active = false;
let stepIndex = 0;
let steps = [];
let root = null;
let resizeObserver = null;
let repositionHandler = null;
let scrollContainer = null;
let currentTarget = null;
let currentStep = null;

function ensureRoot() {
  if (root) return root;

  root = document.createElement("div");
  root.id = "product-tour-root";
  root.className = "product-tour";
  root.setAttribute("hidden", "");
  root.innerHTML = `
    <div class="product-tour__backdrop" data-tour-action="backdrop" aria-hidden="true"></div>
    <div
      class="product-tour__tooltip"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-tour-title"
      aria-describedby="product-tour-body"
    >
      <div class="product-tour__arrow" aria-hidden="true"></div>
      <div class="product-tour__tooltip-inner">
        <div class="product-tour__tooltip-head">
          <div class="product-tour__icon" id="product-tour-icon" aria-hidden="true"></div>
          <div class="product-tour__head-copy">
            <span class="product-tour__step" id="product-tour-progress-text"></span>
            <h2 class="product-tour__title" id="product-tour-title"></h2>
          </div>
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
        </div>
        <p class="product-tour__body" id="product-tour-body"></p>
        <div class="product-tour__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-tour-action="skip">Skip</button>
          <div class="product-tour__nav">
            <button type="button" class="btn btn--secondary btn--sm" data-tour-action="back">Back</button>
            <button type="button" class="btn btn--primary btn--sm" data-tour-action="next">Next</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  bindTooltipActions(root.querySelector(".product-tour__tooltip"));

  return root;
}

function bindTooltipActions(tooltipEl) {
  if (!tooltipEl || tooltipEl.dataset.tourActionsBound) return;
  tooltipEl.dataset.tourActionsBound = "true";

  tooltipEl.addEventListener("click", (e) => {
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
    }
  });
}

function getTooltipEl() {
  return document.querySelector(".product-tour__tooltip");
}

function portalTooltip() {
  const tooltipEl = getTooltipEl();
  if (!tooltipEl || tooltipEl.classList.contains("product-tour__tooltip--portaled")) return;

  document.body.appendChild(tooltipEl);
  tooltipEl.classList.add("product-tour__tooltip--portaled");
  bindTooltipActions(tooltipEl);
}

function restoreTooltip() {
  const tooltipEl = getTooltipEl();
  if (!tooltipEl?.classList.contains("product-tour__tooltip--portaled") || !root) return;

  tooltipEl.classList.remove("product-tour__tooltip--portaled", "product-tour__tooltip--docked");
  root.appendChild(tooltipEl);
}

function shouldDockTooltip(step, target = currentTarget) {
  return window.matchMedia(MOBILE_DOCK_QUERY).matches
    && step?.placement !== "center"
    && Boolean(target);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForRoute(path) {
  if (getCurrentPath() === path) return wait(120);

  return new Promise((resolve) => {
    const handler = (e) => {
      if (e.detail?.path === path) {
        document.removeEventListener("route:change", handler);
        wait(160).then(resolve);
      }
    };
    document.addEventListener("route:change", handler);
    navigate(path);
  });
}

function parseSelectors(target) {
  if (!target) return [];
  if (Array.isArray(target)) return target;
  return target.split(",").map((s) => s.trim()).filter(Boolean);
}

async function resolveTarget(step) {
  const selectors = parseSelectors(step.target);
  if (!selectors.length) return null;

  const start = Date.now();
  while (Date.now() - start < WAIT_MS) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    await wait(50);
  }
  return null;
}

function getScrollContainer() {
  return document.querySelector("#content") || null;
}

function prepareSidebar(step) {
  if (window.innerWidth <= 768) {
    setState({ sidebarOpen: Boolean(step.expandSidebar) });
    return;
  }

  if (!step.expandSidebar) return;

  if (getState().sidebarCollapsed) {
    setState({ sidebarCollapsed: false });
  }
}

function getTargetRect(target) {
  if (!target) return null;
  return target.getBoundingClientRect();
}

function computeTooltipPlacement(rect, tooltipRect, preferred) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const placements = [...new Set([preferred, "bottom", "top", "right", "left"])];

  for (const side of placements) {
    let top = 0;
    let left = 0;

    if (side === "bottom") {
      top = rect.bottom + TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      if (top + tooltipRect.height <= vh - VIEWPORT_PAD
        && left >= VIEWPORT_PAD
        && left + tooltipRect.width <= vw - VIEWPORT_PAD) {
        return { side, top, left };
      }
    }

    if (side === "top") {
      top = rect.top - TOOLTIP_GAP - tooltipRect.height;
      left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      if (top >= NAVBAR_PAD
        && left >= VIEWPORT_PAD
        && left + tooltipRect.width <= vw - VIEWPORT_PAD) {
        return { side, top, left };
      }
    }

    if (side === "right") {
      top = rect.top + rect.height / 2 - tooltipRect.height / 2;
      left = rect.right + TOOLTIP_GAP;
      if (left + tooltipRect.width <= vw - VIEWPORT_PAD
        && top >= NAVBAR_PAD
        && top + tooltipRect.height <= vh - VIEWPORT_PAD) {
        return { side, top, left };
      }
    }

    if (side === "left") {
      top = rect.top + rect.height / 2 - tooltipRect.height / 2;
      left = rect.left - TOOLTIP_GAP - tooltipRect.width;
      if (left >= VIEWPORT_PAD
        && top >= NAVBAR_PAD
        && top + tooltipRect.height <= vh - VIEWPORT_PAD) {
        return { side, top, left };
      }
    }
  }

  const top = Math.max(NAVBAR_PAD, Math.min(rect.bottom + TOOLTIP_GAP, vh - tooltipRect.height - VIEWPORT_PAD));
  const left = Math.max(
    VIEWPORT_PAD,
    Math.min(rect.left + rect.width / 2 - tooltipRect.width / 2, vw - tooltipRect.width - VIEWPORT_PAD),
  );

  return { side: "bottom", top, left, fallback: true };
}

function positionArrow(arrowEl, side, rect, tooltipRect, tooltipTop, tooltipLeft) {
  if (!arrowEl) return;

  arrowEl.className = `product-tour__arrow product-tour__arrow--${side}`;

  const arrowSize = 10;
  let arrowTop = 0;
  let arrowLeft = 0;

  if (side === "bottom") {
    arrowTop = -arrowSize;
    arrowLeft = rect.left + rect.width / 2 - tooltipLeft - arrowSize;
  } else if (side === "top") {
    arrowTop = tooltipRect.height - 1;
    arrowLeft = rect.left + rect.width / 2 - tooltipLeft - arrowSize;
  } else if (side === "right") {
    arrowTop = rect.top + rect.height / 2 - tooltipTop - arrowSize;
    arrowLeft = -arrowSize;
  } else if (side === "left") {
    arrowTop = rect.top + rect.height / 2 - tooltipTop - arrowSize;
    arrowLeft = tooltipRect.width - 1;
  }

  arrowLeft = Math.max(16, Math.min(arrowLeft, tooltipRect.width - 32));
  arrowEl.style.top = `${arrowTop}px`;
  arrowEl.style.left = `${arrowLeft}px`;
}

function positionTooltipDocked(tooltipEl, arrowEl) {
  tooltipEl.className = "product-tour__tooltip product-tour__tooltip--portaled product-tour__tooltip--docked";
  tooltipEl.style.transform = "";
  tooltipEl.style.width = "";
  tooltipEl.style.top = "auto";
  tooltipEl.style.left = "";
  tooltipEl.style.right = "";
  tooltipEl.style.bottom = "";
  tooltipEl.dataset.placement = "docked";
  if (arrowEl) arrowEl.style.display = "none";
}

function positionTooltipCenter(tooltipEl) {
  const arrowEl = $(".product-tour__arrow", tooltipEl);
  tooltipEl.className = "product-tour__tooltip product-tour__tooltip--portaled product-tour__tooltip--center";
  tooltipEl.style.top = "50%";
  tooltipEl.style.left = "50%";
  tooltipEl.style.right = "";
  tooltipEl.style.bottom = "auto";
  tooltipEl.style.transform = "translate(-50%, -50%)";
  tooltipEl.style.width = `min(380px, calc(100vw - ${VIEWPORT_PAD * 2}px))`;
  if (arrowEl) arrowEl.style.display = "none";
}

function positionTooltipAnchored(tooltipEl, arrowEl, target, step) {
  if (shouldDockTooltip(step)) {
    positionTooltipDocked(tooltipEl, arrowEl);
    return;
  }

  const rect = getTargetRect(target);
  if (!rect) return;

  tooltipEl.className = "product-tour__tooltip product-tour__tooltip--portaled";
  tooltipEl.style.transform = "";
  tooltipEl.style.width = `min(320px, calc(100vw - ${VIEWPORT_PAD * 2}px))`;
  tooltipEl.style.visibility = "hidden";
  tooltipEl.style.top = "0";
  tooltipEl.style.left = "0";
  tooltipEl.style.right = "";
  tooltipEl.style.bottom = "auto";
  if (arrowEl) arrowEl.style.display = "";

  const tooltipRect = tooltipEl.getBoundingClientRect();
  const preferred = window.innerWidth <= 640 ? "bottom" : (step.placement || "bottom");
  const { side, top, left } = computeTooltipPlacement(rect, tooltipRect, preferred);

  tooltipEl.style.visibility = "";
  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
  tooltipEl.dataset.placement = side;

  positionArrow(arrowEl, side, rect, tooltipRect, top, left);
}

function updateLayout() {
  if (!active || !root) return;

  const tooltipEl = getTooltipEl();
  const arrowEl = tooltipEl ? $(".product-tour__arrow", tooltipEl) : null;
  if (!tooltipEl) return;

  if (!currentTarget || currentStep?.placement === "center") {
    positionTooltipCenter(tooltipEl);
    return;
  }

  positionTooltipAnchored(tooltipEl, arrowEl, currentTarget, currentStep);
}

async function scrollTargetIntoView(target, step) {
  if (!target) return;

  const container = getScrollContainer();
  const tooltipEl = getTooltipEl();
  const docked = shouldDockTooltip(step, target);
  const tooltipHeight = docked ? DOCKED_TOOLTIP_RESERVE : (tooltipEl?.offsetHeight || 180);

  target.scrollIntoView({ block: docked ? "start" : "center", inline: "nearest", behavior: "auto" });
  await wait(20);

  const rect = target.getBoundingClientRect();
  const minTop = NAVBAR_PAD + 8;
  const maxBottom = window.innerHeight - tooltipHeight - VIEWPORT_PAD - (docked ? 0 : TOOLTIP_GAP);

  let delta = 0;
  if (rect.top < minTop) delta = rect.top - minTop;
  else if (rect.bottom > maxBottom) delta = rect.bottom - maxBottom;

  if (Math.abs(delta) > 4 && container) {
    container.scrollBy({ top: delta, behavior: "smooth" });
    await wait(240);
  }
}

function bindReposition(target, step) {
  unbindReposition();

  currentTarget = target;
  currentStep = step;
  scrollContainer = getScrollContainer();

  repositionHandler = () => updateLayout();

  window.addEventListener("resize", repositionHandler, { passive: true });
  window.addEventListener("scroll", repositionHandler, { passive: true, capture: true });
  scrollContainer?.addEventListener("scroll", repositionHandler, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(repositionHandler);
    if (target) resizeObserver.observe(target);
    const tooltipEl = getTooltipEl();
    if (tooltipEl) resizeObserver.observe(tooltipEl);
  }

  updateLayout();
}

function unbindReposition() {
  if (repositionHandler) {
    window.removeEventListener("resize", repositionHandler);
    window.removeEventListener("scroll", repositionHandler, true);
    scrollContainer?.removeEventListener("scroll", repositionHandler);
    repositionHandler = null;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
  scrollContainer = null;
  currentTarget = null;
  currentStep = null;
}

function renderStepUI(step, index) {
  const tooltipEl = getTooltipEl();
  if (!tooltipEl) return;

  const iconEl = $("#product-tour-icon", tooltipEl);
  const titleEl = $("#product-tour-title", tooltipEl);
  const bodyEl = $("#product-tour-body", tooltipEl);
  const progressEl = $("#product-tour-progress", tooltipEl);
  const progressTextEl = $("#product-tour-progress-text", tooltipEl);
  const backBtn = $('[data-tour-action="back"]', tooltipEl);
  const nextBtn = $('[data-tour-action="next"]', tooltipEl);

  if (iconEl) iconEl.innerHTML = icon(step.icon || "info");
  if (titleEl) titleEl.textContent = step.title;
  if (bodyEl) bodyEl.textContent = step.body;

  const pct = Math.round(((index + 1) / steps.length) * 100);
  if (progressEl) progressEl.style.width = `${pct}%`;
  if (progressTextEl) progressTextEl.textContent = `Step ${index + 1} of ${steps.length}`;

  if (backBtn) backBtn.disabled = index === 0;
  if (nextBtn) nextBtn.textContent = index === steps.length - 1 ? "Finish" : "Next";

  root?.setAttribute("aria-label", `Tour: ${step.title}`);
}

async function showStep(index) {
  const step = steps[index];
  if (!step) return;

  stepIndex = index;
  prepareSidebar(step);

  if (step.route) await waitForRoute(step.route);

  clearTargetHighlight();
  const target = await resolveTarget(step);

  renderStepUI(step, index);

  if (target) {
    target.classList.add("product-tour__target");
    await scrollTargetIntoView(target, step);
  }

  root.dataset.tourTarget = target ? step.id : (step.placement === "center" ? "center" : "missing");
  document.body.classList.toggle("tour-active--anchored", Boolean(target && step.placement !== "center"));

  const tooltipEl = getTooltipEl();
  tooltipEl?.classList.add("is-entering");
  window.setTimeout(() => tooltipEl?.classList.remove("is-entering"), 280);

  requestAnimationFrame(() => {
    bindReposition(target, step);
    requestAnimationFrame(updateLayout);
  });
}

function clearTargetHighlight() {
  document.querySelectorAll(".product-tour__target").forEach((el) => {
    el.classList.remove("product-tour__target");
  });
}

function openTourUI() {
  ensureRoot();
  portalTooltip();
  root.removeAttribute("hidden");
  document.body.classList.add("tour-active");
  active = true;
}

function closeTourUI() {
  unbindReposition();
  clearTargetHighlight();
  restoreTooltip();
  root?.setAttribute("hidden", "");
  document.body.classList.remove("tour-active", "tour-active--anchored");
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
  await showStep(stepIndex + 1);
}

async function goBack() {
  if (stepIndex <= 0) return;
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
    $(".navbar")?.classList.remove("navbar--help-open");
  });
}

export function maybeAutoStartTour() {
  if (!isAuthenticated()) return;

  const { completed, dismissed } = getTourState();
  if (completed || dismissed) return;
  if (isPublicRoute(getCurrentPath())) return;

  window.setTimeout(() => {
    if (!isTourActive()) void startTour({ fromStep: 0 });
  }, 900);
}