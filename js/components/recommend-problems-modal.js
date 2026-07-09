/**
 * Post-lesson modal — semi-automatic roadmap problem recommendations.
 */

import { icon } from "./icons.js";
import { Modal } from "./ui/modal.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import { slugToTitle } from "../services/leetcode.js";
import { addRoadmapProblems } from "../services/roadmap-problems.js";
import { showToast, Toast } from "./ui/index.js";

const MODAL_ID = "recommend-problems";

let shellReady = false;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderShell() {
  return Modal({
    id: MODAL_ID,
    title: "Add recommended problems?",
    size: "md",
    body: '<div id="recommend-problems-body" class="recommend-problems"></div>',
    footer: '<div id="recommend-problems-footer" class="recommend-problems__footer"></div>',
  });
}

function renderBody({ topicName, slugs }) {
  return `
    <p class="recommend-problems__intro">
      Practice <strong>${escapeHtml(topicName)}</strong> with curated LeetCode problems.
      Select any to add to your Problems list.
    </p>
    <ul class="recommend-problems__list">
      ${slugs.map((slug) => `
        <li>
          <label class="recommend-problems__item">
            <input type="checkbox" name="recommend-slug" value="${escapeHtml(slug)}" checked>
            <span class="recommend-problems__item-title">${escapeHtml(slugToTitle(slug))}</span>
            <span class="recommend-problems__item-slug">${escapeHtml(slug)}</span>
          </label>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderFooter() {
  return `
    <button class="btn btn--secondary" type="button" data-recommend-action="skip">Skip for now</button>
    <button class="btn btn--primary" type="button" data-recommend-action="add">
      ${icon("plus")}<span>Add selected</span>
    </button>
  `;
}

function ensureShell() {
  if (shellReady) return;
  shellReady = true;
  document.body.insertAdjacentHTML("beforeend", renderShell());
  initModals(document);

  const overlay = document.getElementById(`${MODAL_ID}-overlay`);
  overlay?.addEventListener("click", (e) => {
    const action = e.target.closest("[data-recommend-action]")?.dataset.recommendAction;
    if (!action) return;

    if (action === "skip") {
      closeModal(MODAL_ID);
      finishRecommend(overlay, { added: false, count: 0 });
      return;
    }

    if (action === "add") {
      const btn = e.target.closest("[data-recommend-action='add']");
      btn?.setAttribute("disabled", "true");
      void handleAddSelected(overlay);
    }
  });
}

function finishRecommend(overlay, result) {
  const finish = overlay?._finish;
  if (!finish) return;
  overlay._finish = null;
  finish(result);
}

async function handleAddSelected(overlay) {
  const topicId = overlay?.dataset.topicId || "";
  const topicName = overlay?.dataset.topicName || "";
  const checked = [...overlay.querySelectorAll('input[name="recommend-slug"]:checked')]
    .map((el) => el.value);

  if (!checked.length) {
    closeModal(MODAL_ID);
    finishRecommend(overlay, { added: false, count: 0 });
    return;
  }

  try {
    const created = await addRoadmapProblems({ topicId, topicName, slugs: checked });
    closeModal(MODAL_ID);
    showToast(Toast({
      title: `${created.length} problem${created.length !== 1 ? "s" : ""} added`,
      text: "Find them in your Problems list.",
      variant: "success",
    }));
    finishRecommend(overlay, { added: true, count: created.length });
  } catch (err) {
    console.error("[recommend-problems]", err);
    showToast(Toast({
      title: "Could not add problems",
      text: err?.message || "Try again from the Problems page.",
      variant: "danger",
    }));
    overlay.querySelector("[data-recommend-action='add']")?.removeAttribute("disabled");
  }
}

/**
 * @param {{ topicId: string, topicName: string, slugs: string[] }} options
 * @returns {Promise<{ added: boolean, count: number }>}
 */
export function openRecommendProblemsModal({ topicId, topicName, slugs }) {
  ensureShell();

  return new Promise((resolve) => {
    const overlay = document.getElementById(`${MODAL_ID}-overlay`);
    if (!overlay) {
      resolve({ added: false, count: 0 });
      return;
    }

    overlay.dataset.topicId = topicId;
    overlay.dataset.topicName = topicName;

    let wasOpen = false;
    overlay._finish = (result) => {
      observer.disconnect();
      resolve(result);
    };

    const observer = new MutationObserver(() => {
      const open = overlay.classList.contains("is-open");
      if (open) wasOpen = true;
      else if (wasOpen) finishRecommend(overlay, { added: false, count: 0 });
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });

    const body = document.getElementById("recommend-problems-body");
    const footer = document.getElementById("recommend-problems-footer");
    if (body) body.innerHTML = renderBody({ topicName, slugs });
    if (footer) footer.innerHTML = renderFooter();

    const title = document.getElementById(`${MODAL_ID}-title`);
    if (title) title.textContent = "Add recommended problems?";

    openModal(MODAL_ID);
  });
}

export function initRecommendProblemsModal() {
  ensureShell();
}