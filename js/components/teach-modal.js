/**
 * Premium AI tutor modal — structured lessons from /api/teach (Gemini)
 */

import { icon } from "./icons.js";
import { Badge, DifficultyBadge } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import { teachTopic, TeachApiError } from "../api/geminiApi.js";
import { canAccessTopic } from "../auth/access.js";
import { getSessionUser } from "../auth/session.js";
import { openUpgradeModal } from "./upgrade-modal.js";

const MODAL_ID = "teach";

const SECTION_ICONS = ["clock", "layers", "zap", "database"];

let shellReady = false;
let activeRequest = null;
let loadingTimer = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="teach-inline-code">$1</code>');
}

function formatTextBlock(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => formatInlineMarkdown(line)).join("<br>");
      return `<p class="teach-prose__p">${lines}</p>`;
    })
    .join("");
}

function formatMarkdown(content) {
  const parts = [];
  const regex = /```(?:cpp|c\+\+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.map((part) => {
    if (part.type === "code") {
      return `
        <div class="teach-code-block">
          <div class="teach-code-block__bar">
            <span class="teach-code-block__lang">C++</span>
          </div>
          <pre class="teach-code-block__pre"><code>${escapeHtml(part.value)}</code></pre>
        </div>
      `;
    }
    return `<div class="teach-prose">${formatTextBlock(part.value)}</div>`;
  }).join("");
}

function parseSections(content) {
  const chunks = content.split(/^##\s+/m).map((s) => s.trim()).filter(Boolean);

  if (chunks.length <= 1) {
    return [{
      number: 1,
      title: "Lesson",
      body: formatMarkdown(content),
    }];
  }

  return chunks.map((chunk, i) => {
    const newline = chunk.indexOf("\n");
    const rawTitle = newline === -1 ? chunk : chunk.slice(0, newline);
    const body = newline === -1 ? "" : chunk.slice(newline + 1);
    const title = rawTitle.replace(/^\d+\.\s*/, "").trim();

    return {
      number: i + 1,
      title,
      body: formatMarkdown(body),
    };
  });
}

function renderSectionCard(section, index) {
  const iconName = SECTION_ICONS[index] || "info";

  return `
    <article class="teach-section animate-fade-in-up" style="animation-delay: ${index * 60}ms">
      <div class="teach-section__head">
        <div class="teach-section__icon" aria-hidden="true">${icon(iconName)}</div>
        <div>
          <span class="teach-section__num">Section ${section.number}</span>
          <h3 class="teach-section__title">${escapeHtml(section.title)}</h3>
        </div>
      </div>
      <div class="teach-section__body">${section.body}</div>
    </article>
  `;
}

function renderLesson(content) {
  const sections = parseSections(content);
  return `
    <div class="teach-lesson">
      ${sections.map(renderSectionCard).join("")}
    </div>
  `;
}

function renderLoadingSteps(activeIndex = 0) {
  const steps = [
    "History & Problem",
    "Real Life Analogy",
    "Technical Deep Dive",
    "C++ Examples",
  ];

  return steps.map((label, i) => `
    <span class="teach-loading__step${i <= activeIndex ? " is-active" : ""}${i < activeIndex ? " is-done" : ""}">
      <span class="teach-loading__step-dot" aria-hidden="true"></span>
      ${label}
    </span>
  `).join("");
}

function renderLoading(topicName) {
  return `
    <div class="teach-loading">
      <div class="teach-loading__hero">
        <div class="teach-loading__ring" aria-hidden="true">
          <div class="teach-loading__spinner">${icon("loader")}</div>
        </div>
        <p class="teach-loading__title">Generating your lesson</p>
        <p class="teach-loading__sub">Building a structured guide for <strong>${escapeHtml(topicName)}</strong></p>
        <div class="teach-loading__steps" id="teach-loading-steps">
          ${renderLoadingSteps(0)}
        </div>
      </div>
      <div class="teach-loading__skeletons" aria-hidden="true">
        ${Array.from({ length: 4 }, (_, i) => `
          <div class="teach-skeleton" style="animation-delay: ${i * 100}ms">
            <div class="teach-skeleton__line teach-skeleton__line--short"></div>
            <div class="teach-skeleton__line"></div>
            <div class="teach-skeleton__line"></div>
            <div class="teach-skeleton__line teach-skeleton__line--medium"></div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderError(message) {
  return `
    <div class="teach-error">
      <div class="teach-error__icon" aria-hidden="true">${icon("alertCircle")}</div>
      <h3 class="teach-error__title">Couldn't load lesson</h3>
      <p class="teach-error__text">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderModalShell() {
  return `
    <div class="modal-overlay" id="${MODAL_ID}-overlay" data-modal="${MODAL_ID}" aria-hidden="true">
      <div class="modal modal--teach modal--xl teach-modal" role="dialog" aria-modal="true" aria-labelledby="${MODAL_ID}-title">
        <div class="teach-modal__header">
          <div class="teach-modal__header-main">
            <span class="teach-modal__eyebrow">${icon("zap")} AI Lesson</span>
            <h2 class="teach-modal__title" id="${MODAL_ID}-title">Topic</h2>
            <div class="teach-modal__meta" id="${MODAL_ID}-meta"></div>
          </div>
          <button class="modal__close teach-modal__close" type="button" data-modal-close aria-label="Close lesson">
            ${icon("close")}
          </button>
        </div>
        <div class="modal__body teach-modal__body" id="${MODAL_ID}-body">
          ${renderLoading("Topic")}
        </div>
      </div>
    </div>
  `;
}

function getElements() {
  return {
    titleEl: document.getElementById(`${MODAL_ID}-title`),
    metaEl: document.getElementById(`${MODAL_ID}-meta`),
    bodyEl: document.getElementById(`${MODAL_ID}-body`),
  };
}

function renderMeta(topic) {
  const parts = [];
  if (topic.phase) parts.push(Badge({ label: `Phase ${topic.phase}`, variant: "accent", size: "sm" }));
  if (topic.difficulty) parts.push(DifficultyBadge(topic.difficulty));
  if (topic.track) {
    const variant = topic.track === "cpp" ? "accent" : topic.track === "dsa" ? "success" : "default";
    parts.push(Badge({ label: topic.track.toUpperCase(), variant, size: "sm" }));
  }
  return parts.join("");
}

function setModalState({ title, metaHtml, bodyHtml }) {
  const { titleEl, metaEl, bodyEl } = getElements();
  if (titleEl) titleEl.textContent = title;
  if (metaEl && metaHtml !== undefined) metaEl.innerHTML = metaHtml;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
}

function startLoadingAnimation() {
  stopLoadingAnimation();
  let step = 0;
  loadingTimer = setInterval(() => {
    const stepsEl = document.getElementById("teach-loading-steps");
    if (!stepsEl) return;
    step = Math.min(step + 1, 3);
    stepsEl.innerHTML = renderLoadingSteps(step);
  }, 2200);
}

function stopLoadingAnimation() {
  if (loadingTimer) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
}

export function parseTopicFromButton(btn) {
  const stepRaw = btn.dataset.topicStep;
  return {
    id: btn.dataset.topicId || "",
    name: btn.dataset.topicName || btn.dataset.topicTitle || "Topic",
    phase: btn.dataset.topicPhase ? Number(btn.dataset.topicPhase) : undefined,
    step: stepRaw ? Number(stepRaw) : undefined,
    difficulty: btn.dataset.topicDifficulty || "",
    track: btn.dataset.topicTrack || "",
  };
}

/**
 * Open the teach modal and fetch a lesson from /api/teach.
 * @param {Object} topic
 * @param {HTMLButtonElement} [triggerBtn]
 */
export async function openTeachLesson(topic, triggerBtn) {
  ensureTeachModalShell();

  const name = topic.name || "Topic";

  setModalState({
    title: name,
    metaHtml: renderMeta(topic),
    bodyHtml: renderLoading(name),
  });
  openModal(MODAL_ID);
  startLoadingAnimation();

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.classList.add("is-loading");
  }

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;

  try {
    const result = await teachTopic({
      id: topic.id,
      name: topic.name,
      phase: topic.phase,
      difficulty: topic.difficulty,
      track: topic.track,
    }, { signal: controller.signal, timeoutMs: 120_000 });

    if (controller.signal.aborted) return;

    stopLoadingAnimation();
    setModalState({
      title: name,
      metaHtml: renderMeta(topic),
      bodyHtml: renderLesson(result.content),
    });
  } catch (err) {
    if (controller.signal.aborted) return;

    stopLoadingAnimation();
    const message = err instanceof TeachApiError
      ? err.message
      : "Something went wrong. Please try again.";

    setModalState({
      title: name,
      metaHtml: renderMeta(topic),
      bodyHtml: renderError(message),
    });
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.classList.remove("is-loading");
    }
    if (activeRequest === controller) activeRequest = null;
  }
}

function onTeachButtonClick(e) {
  const btn = e.target.closest('[data-action="teach-topic"]');
  if (!btn || btn.disabled) return;

  e.preventDefault();
  e.stopPropagation();

  const topic = parseTopicFromButton(btn);
  const user = getSessionUser();

  if (!canAccessTopic(user, topic, topic.step)) {
    openUpgradeModal();
    return;
  }

  openTeachLesson(topic, btn);
}

/**
 * Wire Learn buttons inside a page container (call from roadmap onMount).
 * @param {HTMLElement} root
 */
export function bindTeachTopicHandlers(root) {
  if (!root || root.dataset.teachHandlersBound === "true") return;
  root.dataset.teachHandlersBound = "true";
  root.addEventListener("click", onTeachButtonClick);
}

function ensureTeachModalShell() {
  if (shellReady) return;
  shellReady = true;

  document.body.insertAdjacentHTML("beforeend", renderModalShell());
  initModals(document);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      activeRequest?.abort();
      stopLoadingAnimation();
    }
  });
}

export function initTeachModal() {
  ensureTeachModalShell();
}

export function closeTeachModal() {
  activeRequest?.abort();
  stopLoadingAnimation();
  closeModal(MODAL_ID);
}