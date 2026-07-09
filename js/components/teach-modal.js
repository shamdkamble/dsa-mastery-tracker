/**
 * AI tutor modal — cached lessons, simpler variant, roadmap progress
 */

import { icon } from "./icons.js";
import { Badge, DifficultyBadge } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import { TeachApiError } from "../api/geminiApi.js";
import { fetchCachedLesson, fetchLesson } from "../api/teachApi.js";
import {
  canAccessAiGeneration,
  canAccessCachedLesson,
  canOpenLesson,
  hasTrialAccess,
} from "../auth/access.js";
import { getSessionUser } from "../auth/session.js";
import { renderAiLockedPanel, renderLockedAiButton } from "./access-ui.js";
import { openUpgradeModal } from "./upgrade-modal.js";
import {
  getNextRoadmapTopic,
  topicTrackFromId,
} from "../data/roadmap.js";
import {
  isTopicCompleted,
  markTopicComplete,
} from "../storage/roadmap-progress.js";
import { refreshPage } from "../controllers/page-controller.js";
import { getPendingRecommendations } from "../services/roadmap-problems.js";
import { openRecommendProblemsModal } from "./recommend-problems-modal.js";

const MODAL_ID = "teach";
const SECTION_ICONS = ["clock", "layers", "zap", "database"];

let shellReady = false;
let activeRequest = null;
let loadingTimer = null;
let currentTopic = null;

/** @type {{ standard: string, simpler: string, activeVariant: 'standard' | 'simpler', hasSimpler: boolean, cached: boolean }} */
let lessonState = {
  standard: "",
  simpler: "",
  activeVariant: "standard",
  hasSimpler: false,
  cached: false,
};

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
      title: "Lesson",
      body: formatMarkdown(content),
    }];
  }

  return chunks.map((chunk) => {
    const newline = chunk.indexOf("\n");
    const rawTitle = newline === -1 ? chunk : chunk.slice(0, newline);
    const body = newline === -1 ? "" : chunk.slice(newline + 1);
    const title = rawTitle
      .replace(/^section\s*\d+\s*[:.\-–—]?\s*/i, "")
      .replace(/^\d+\.\s*/, "")
      .trim();

    return {
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
    "Why It Was Invented",
    "Core Idea & How It Works",
    "Real-World Uses",
    "Simple Implementation",
  ];

  return steps.map((label, i) => `
    <span class="teach-loading__step${i <= activeIndex ? " is-active" : ""}${i < activeIndex ? " is-done" : ""}">
      <span class="teach-loading__step-dot" aria-hidden="true"></span>
      ${label}
    </span>
  `).join("");
}

function renderLoading(topicName, { cachedHint = false } = {}) {
  return `
    <div class="teach-loading">
      <div class="teach-loading__hero">
        <div class="teach-loading__ring" aria-hidden="true">
          <div class="teach-loading__spinner">${icon("loader")}</div>
        </div>
        <p class="teach-loading__title">${cachedHint ? "Loading your lesson" : "Preparing your lesson"}</p>
        <p class="teach-loading__sub">
          ${cachedHint
            ? `Fetching <strong>${escapeHtml(topicName)}</strong> from your lesson library`
            : `Your mentor is building a focused lesson on <strong>${escapeHtml(topicName)}</strong>`}
        </p>
        ${cachedHint ? "" : `
        <div class="teach-loading__steps" id="teach-loading-steps">
          ${renderLoadingSteps(0)}
        </div>`}
      </div>
      ${cachedHint ? "" : `
      <div class="teach-loading__skeletons" aria-hidden="true">
        ${Array.from({ length: 4 }, (_, i) => `
          <div class="teach-skeleton" style="animation-delay: ${i * 100}ms">
            <div class="teach-skeleton__line teach-skeleton__line--short"></div>
            <div class="teach-skeleton__line"></div>
            <div class="teach-skeleton__line"></div>
            <div class="teach-skeleton__line teach-skeleton__line--medium"></div>
          </div>
        `).join("")}
      </div>`}
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

function renderCacheBadge() {
  return `<span class="teach-cache-badge">${icon("database")} Saved lesson</span>`;
}

function renderFooter() {
  const user = getSessionUser();
  const aiLocked = currentTopic && !canAccessAiGeneration(user, currentTopic);
  const hasSimpler = Boolean(lessonState.simpler);
  const isStandard = lessonState.activeVariant === "standard";
  const isSimpler = lessonState.activeVariant === "simpler";
  const completed = currentTopic?.id && isTopicCompleted(currentTopic.id);

  const simplerControl = aiLocked && !hasSimpler
    ? renderLockedAiButton({
        id: "teach-simpler-btn",
        label: "Explain in Simpler Words",
        title: "Upgrade to Premium to unlock AI lesson tools",
      })
    : `<button
        type="button"
        class="btn btn--ghost btn--sm"
        id="teach-simpler-btn"
        ${hasSimpler ? "hidden" : ""}
      >
        ${icon("layers")}
        <span>Explain in Simpler Words</span>
      </button>`;

  return `
    <div class="teach-modal__toolbar">
      <div class="teach-variant-tabs" role="tablist" aria-label="Lesson version">
        <button
          type="button"
          class="teach-variant-tab${isStandard ? " is-active" : ""}"
          data-variant="standard"
          role="tab"
          aria-selected="${isStandard}"
        >Standard</button>
        <button
          type="button"
          class="teach-variant-tab${isSimpler ? " is-active" : ""}${hasSimpler ? "" : " is-disabled"}"
          data-variant="simpler"
          role="tab"
          aria-selected="${isSimpler}"
          ${hasSimpler ? "" : "disabled"}
          ${aiLocked && !hasSimpler ? 'title="Upgrade to Premium"' : ""}
        >Simpler</button>
      </div>
      ${simplerControl}
    </div>
    <button
      type="button"
      class="btn btn--primary btn--lg teach-complete-btn"
      id="teach-complete-btn"
    >
      ${icon("check")}
      <span>${completed ? "Continue to Next Topic" : "Mark Complete & Continue"}</span>
    </button>
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
        <div class="teach-modal__footer" id="${MODAL_ID}-footer" hidden></div>
      </div>
    </div>
  `;
}

function getElements() {
  return {
    titleEl: document.getElementById(`${MODAL_ID}-title`),
    metaEl: document.getElementById(`${MODAL_ID}-meta`),
    bodyEl: document.getElementById(`${MODAL_ID}-body`),
    footerEl: document.getElementById(`${MODAL_ID}-footer`),
  };
}

function renderMeta(topic, { cached = false } = {}) {
  const parts = [];
  if (topic.phase) parts.push(Badge({ label: `Phase ${topic.phase}`, variant: "accent", size: "sm" }));
  if (topic.difficulty) parts.push(DifficultyBadge(topic.difficulty));
  if (topic.track) {
    const variant = topic.track === "cpp" ? "accent" : topic.track === "dsa" ? "success" : "default";
    parts.push(Badge({ label: topic.track.toUpperCase(), variant, size: "sm" }));
  }
  if (cached) parts.push(renderCacheBadge());
  if (topic.id && isTopicCompleted(topic.id)) {
    parts.push(Badge({ label: "Completed", variant: "success", size: "sm" }));
  }
  return parts.join("");
}

function bindFooterUpgradeHandlers() {
  document.getElementById(`${MODAL_ID}-footer`)?.querySelectorAll('[data-action="upgrade-ai"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openUpgradeModal("ai-lesson");
    });
  });
}

function setFooterVisible(show) {
  const { footerEl } = getElements();
  if (footerEl) {
    footerEl.hidden = !show;
    if (show) {
      footerEl.innerHTML = renderFooter();
      bindFooterUpgradeHandlers();
    }
  }
}

function setModalState({ title, metaHtml, bodyHtml, showFooter = false }) {
  const { titleEl, metaEl, bodyEl } = getElements();
  if (titleEl) titleEl.textContent = title;
  if (metaEl && metaHtml !== undefined) metaEl.innerHTML = metaHtml;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  setFooterVisible(showFooter);
}

function activeContent() {
  return lessonState.activeVariant === "simpler" && lessonState.simpler
    ? lessonState.simpler
    : lessonState.standard;
}

function renderLessonView() {
  setModalState({
    title: currentTopic?.name || "Topic",
    metaHtml: renderMeta(currentTopic, { cached: lessonState.cached }),
    bodyHtml: renderLesson(activeContent()),
    showFooter: true,
  });
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

function normalizeTopic(topic) {
  const track = topic.track || topicTrackFromId(topic.id);
  return { ...topic, track };
}

async function tryLoadCachedLesson(topicId) {
  try {
    const data = await fetchCachedLesson(topicId);
    if (!data?.standard?.content) return false;

    lessonState.standard = data.standard.content;
    lessonState.simpler = data.simpler?.content || "";
    lessonState.hasSimpler = Boolean(lessonState.simpler);
    lessonState.cached = true;
    lessonState.activeVariant = "standard";
    return true;
  } catch (err) {
    if (err instanceof TeachApiError && err.code === "NOT_FOUND") return false;
    console.warn("[teach-modal] cache lookup failed", err);
    return false;
  }
}

async function loadStandardLesson(topic, signal) {
  const result = await fetchLesson(topic, { variant: "standard", signal, timeoutMs: 120_000 });
  lessonState.standard = result.content;
  lessonState.cached = Boolean(result.cached);
  if (result.simplerContent) {
    lessonState.simpler = result.simplerContent;
    lessonState.hasSimpler = true;
  } else {
    lessonState.hasSimpler = Boolean(result.hasSimpler) || Boolean(lessonState.simpler);
  }
  lessonState.activeVariant = "standard";
  return result;
}

async function loadSimplerLesson(topic, signal) {
  const result = await fetchLesson(topic, { variant: "simpler", signal, timeoutMs: 120_000 });
  lessonState.simpler = result.content;
  lessonState.hasSimpler = true;
  lessonState.activeVariant = "simpler";
  return result;
}

function switchVariant(variant) {
  if (variant === "simpler" && !lessonState.simpler) return;
  lessonState.activeVariant = variant;
  renderLessonView();
}

function renderAiLockedState(topicName) {
  return renderAiLockedPanel({
    title: "AI lesson not available",
    description: "Your plan includes this topic, but AI lesson generation is a Premium feature. Upgrade to generate personalized lessons on demand.",
    feature: `Generate an AI lesson for ${topicName}`,
  });
}

async function handleSimplerWords() {
  const user = getSessionUser();
  if (currentTopic && !canAccessAiGeneration(user, currentTopic)) {
    openUpgradeModal("ai-lesson");
    return;
  }

  if (!currentTopic || lessonState.simpler) {
    switchVariant("simpler");
    return;
  }

  const btn = document.getElementById("teach-simpler-btn");
  btn?.classList.add("is-loading");
  btn?.setAttribute("disabled", "true");

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;

  try {
    await loadSimplerLesson(currentTopic, controller.signal);
    if (controller.signal.aborted) return;
    renderLessonView();
  } catch (err) {
    if (controller.signal.aborted) return;
    const message = err instanceof TeachApiError ? err.message : "Could not simplify lesson.";
    setModalState({
      title: currentTopic.name,
      metaHtml: renderMeta(currentTopic),
      bodyHtml: `${renderLesson(activeContent())}<div class="teach-inline-error">${escapeHtml(message)}</div>`,
      showFooter: true,
    });
  } finally {
    btn?.classList.remove("is-loading");
    btn?.removeAttribute("disabled");
    if (activeRequest === controller) activeRequest = null;
  }
}

async function handleMarkComplete() {
  if (!currentTopic?.id) return;

  const btn = document.getElementById("teach-complete-btn");
  btn?.setAttribute("disabled", "true");

  try {
    const wasNewCompletion = !isTopicCompleted(currentTopic.id);
    if (wasNewCompletion) {
      await markTopicComplete(currentTopic.id);
    }

    refreshPage();

    if (wasNewCompletion) {
      const pending = getPendingRecommendations(currentTopic.id);
      if (pending.length > 0) {
        await openRecommendProblemsModal({
          topicId: currentTopic.id,
          topicName: currentTopic.name,
          slugs: pending,
        });
        refreshPage();
      }
    }

    const next = getNextRoadmapTopic(currentTopic.id);
    const user = getSessionUser();

    if (next && canOpenLesson(user, next)) {
      const nextTopic = normalizeTopic({
        id: next.id,
        name: next.name,
        phase: next.phase,
        difficulty: next.difficulty,
        step: next.step,
        track: topicTrackFromId(next.id),
      });
      await openTeachLesson(nextTopic);
      return;
    }

    closeTeachModal();
  } catch (err) {
    console.error("[teach-modal] complete failed", err);
    btn?.removeAttribute("disabled");
  }
}



export function parseTopicFromButton(btn) {
  const stepRaw = btn.dataset.topicStep;
  return normalizeTopic({
    id: btn.dataset.topicId || "",
    name: btn.dataset.topicName || btn.dataset.topicTitle || "Topic",
    phase: btn.dataset.topicPhase ? Number(btn.dataset.topicPhase) : undefined,
    step: stepRaw ? Number(stepRaw) : undefined,
    difficulty: btn.dataset.topicDifficulty || "",
    track: btn.dataset.topicTrack || "",
  });
}

/**
 * Open the teach modal — loads cached lesson or generates once.
 * @param {Object} topic
 * @param {HTMLButtonElement} [triggerBtn]
 */
export async function openTeachLesson(topic, triggerBtn) {
  ensureTeachModalShell();

  currentTopic = normalizeTopic(topic);
  lessonState = {
    standard: "",
    simpler: "",
    activeVariant: "standard",
    hasSimpler: false,
    cached: false,
  };

  const name = currentTopic.name || "Topic";
  const footer = document.getElementById(`${MODAL_ID}-footer`);
  if (footer) footer.hidden = true;

  setModalState({
    title: name,
    metaHtml: renderMeta(currentTopic),
    bodyHtml: renderLoading(name),
    showFooter: false,
  });
  openModal(MODAL_ID);

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.classList.add("is-loading");
  }

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;

  const user = getSessionUser();
  const canGenerate = canAccessAiGeneration(user, currentTopic);
  const canReadCache = canAccessCachedLesson(user, currentTopic);

  try {
    let fromCache = false;

    if (currentTopic.id && canReadCache) {
      setModalState({
        title: name,
        metaHtml: renderMeta(currentTopic),
        bodyHtml: renderLoading(name, { cachedHint: true }),
        showFooter: false,
      });
      fromCache = await tryLoadCachedLesson(currentTopic.id);
    }

    if (fromCache) {
      stopLoadingAnimation();
      renderLessonView();
      return;
    }

    if (!canGenerate) {
      stopLoadingAnimation();
      setModalState({
        title: name,
        metaHtml: renderMeta(currentTopic),
        bodyHtml: renderAiLockedState(name),
        showFooter: false,
      });
      document.getElementById(`${MODAL_ID}-body`)?.querySelector('[data-action="upgrade-ai"]')
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          openUpgradeModal("ai-lesson");
        });
      return;
    }

    setModalState({
      title: name,
      metaHtml: renderMeta(currentTopic),
      bodyHtml: renderLoading(name),
      showFooter: false,
    });
    startLoadingAnimation();

    await loadStandardLesson(currentTopic, controller.signal);
    if (controller.signal.aborted) return;

    stopLoadingAnimation();
    renderLessonView();
  } catch (err) {
    if (controller.signal.aborted) return;

    stopLoadingAnimation();
    const message = err instanceof TeachApiError
      ? err.message
      : "Something went wrong. Please try again.";

    setModalState({
      title: name,
      metaHtml: renderMeta(currentTopic),
      bodyHtml: renderError(message),
      showFooter: false,
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

  if (!canOpenLesson(user, topic)) {
    openUpgradeModal(hasTrialAccess(user) ? "trial" : "standard");
    return;
  }

  void openTeachLesson(topic, btn);
}

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

  document.getElementById(`${MODAL_ID}-footer`)?.addEventListener("click", (e) => {
    const variantBtn = e.target.closest("[data-variant]");
    if (variantBtn && !variantBtn.disabled) {
      switchVariant(variantBtn.dataset.variant);
      return;
    }
    if (e.target.closest("#teach-simpler-btn")) {
      void handleSimplerWords();
      return;
    }
    if (e.target.closest("#teach-complete-btn")) {
      void handleMarkComplete();
    }
  });

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