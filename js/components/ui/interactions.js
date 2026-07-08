/**
 * Interactive component behaviors (modals, tabs, dropdowns, toasts)
 */

import { $, $$ } from "../../utils.js";

let modalListenersBound = false;
let toastListenersBound = false;
const MAX_VISIBLE_TOASTS = 2;
const DEFAULT_TOAST_MS = 2800;

export function initTabs(container = document) {
  $$("[data-tabs]", container).forEach((tabsEl) => {
    if (tabsEl.dataset.tabsInit) return;
    tabsEl.dataset.tabsInit = "true";

    const tabButtons = $$(".tab", tabsEl);
    const panels = $$(".tabs__panel", tabsEl);

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tab;

        tabButtons.forEach((t) => {
          const active = t.dataset.tab === target;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", String(active));
        });

        panels.forEach((p) => {
          const active = p.dataset.panel === target;
          p.classList.toggle("is-active", active);
          p.hidden = !active;
        });
      });
    });
  });
}

export function openModal(id) {
  const overlay = $(`[data-modal="${id}"]`);
  if (!overlay) return;

  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const closeBtn = $(".modal__close", overlay);
  closeBtn?.focus();
}

export function closeModal(id) {
  const overlay = id
    ? $(`[data-modal="${id}"]`)
    : $(".modal-overlay.is-open");

  if (!overlay) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

export function initModals(container = document) {
  if (!modalListenersBound) {
    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-modal-close]");
      if (closeBtn) {
        closeModal();
        return;
      }

      const overlay = e.target.closest(".modal-overlay.is-open");
      if (overlay && e.target === overlay) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    modalListenersBound = true;
  }

  $$("[data-modal-trigger]", container).forEach((trigger) => {
    if (trigger.dataset.modalBound) return;
    trigger.dataset.modalBound = "true";
    trigger.addEventListener("click", () => openModal(trigger.dataset.modalTrigger));
  });
}

export function initDropdowns(container = document) {
  $$(".dropdown", container).forEach((dropdown) => {
    if (dropdown.dataset.dropdownInit) return;
    dropdown.dataset.dropdownInit = "true";

    const trigger = $(".dropdown__trigger", dropdown) || $("button", dropdown);

    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("is-open");

      $$(".dropdown.is-open").forEach((d) => d.classList.remove("is-open"));

      if (!isOpen) dropdown.classList.add("is-open");
    });
  });

  if (!document.body.dataset.dropdownGlobalInit) {
    document.body.dataset.dropdownGlobalInit = "true";
    document.addEventListener("click", () => {
      $$(".dropdown.is-open").forEach((d) => d.classList.remove("is-open"));
    });
  }
}

let alertListenersBound = false;

export function initAlertDismiss() {
  if (alertListenersBound) return;
  alertListenersBound = true;

  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-alert-close]");
    if (closeBtn) {
      closeBtn.closest(".alert")?.remove();
    }
  });
}

function getToastContainer() {
  let container = $("#toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function dismissToast(toast) {
  if (!toast || toast.dataset.exiting === "true") return;
  toast.dataset.exiting = "true";
  toast.classList.add("is-exiting");
  setTimeout(() => toast.remove(), 300);
}

function bindToastDismiss() {
  if (toastListenersBound) return;
  toastListenersBound = true;

  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-toast-close]");
    if (closeBtn) {
      dismissToast(closeBtn.closest(".toast"));
    }
  });
}

/**
 * Show a single, deduplicated toast notification.
 * Replaces an existing toast with the same title instead of stacking duplicates.
 */
export function showToast(html, duration = DEFAULT_TOAST_MS) {
  bindToastDismiss();

  const container = getToastContainer();
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  const toast = wrapper.firstElementChild;
  if (!toast) return;

  const title = toast.dataset.toastTitle
    || toast.querySelector(".toast__title")?.textContent?.trim()
    || "";

  if (title) {
    [...container.children].forEach((existing) => {
      const existingTitle = existing.dataset.toastTitle
        || existing.querySelector(".toast__title")?.textContent?.trim();
      if (existingTitle === title) {
        dismissToast(existing);
      }
    });
  }

  while (container.children.length >= MAX_VISIBLE_TOASTS) {
    dismissToast(container.firstElementChild);
  }

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
}

export function initInteractions(container = document) {
  initTabs(container);
  initModals(container);
  initDropdowns(container);
  initAlertDismiss();
}