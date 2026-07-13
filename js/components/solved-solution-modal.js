/**
 * Read-only solved solution view — post-submit complexity & suggestions only.
 */

import { icon } from "./icons.js";
import { Modal, Button, DifficultyBadge } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import { getProblem, updateProblem } from "../storage/db.js";
import { getProblemLeetcodeUrl } from "./leetcode-actions.js";
import { formatMinutes, formatRelativeTime } from "../storage/helpers.js";
import { showToast, Toast } from "./ui/index.js";
import { analyzeComplexity, analyzeSolutionSuggestions } from "../api/problemAiApi.js";
import { refreshPage } from "../controllers/page-controller.js";

const MODAL_ID = "solved-solution-modal";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function hasSolutionCode(problem) {
  return Boolean(problem?.solution?.trim());
}

function renderCodeBlock(code) {
  if (!code?.trim()) {
    return `<p class="solved-view__empty">No solution code saved.</p>`;
  }
  return `<pre class="solved-view__code"><code>${escapeHtml(code)}</code></pre>`;
}

function renderComplexityContent({ timeComplexity = "", spaceComplexity = "", complexityExplanation = "" } = {}) {
  const time = timeComplexity?.trim();
  const space = spaceComplexity?.trim();
  const explanation = complexityExplanation?.trim();

  if (!time && !space && !explanation) {
    return `<p class="solved-view__empty">Not analyzed yet.</p>`;
  }

  return `
    <div class="problem-complexity__result">
      <div class="problem-complexity__badges">
        ${time ? `<span class="badge badge--accent">Time: ${escapeHtml(time)}</span>` : ""}
        ${space ? `<span class="badge badge--info">Space: ${escapeHtml(space)}</span>` : ""}
      </div>
      ${explanation ? `<p class="problem-complexity__explanation">${escapeHtml(explanation)}</p>` : ""}
    </div>
  `;
}

function renderSuggestionsContent(text, { isOptimal = false } = {}) {
  if (!text?.trim()) {
    return `<p class="solved-view__empty">Not generated yet.</p>`;
  }
  return `
    <div class="solve-complete__suggestions${isOptimal ? " solve-complete__suggestions--optimal" : ""}">
      <p class="solved-view__suggestions-text">${escapeHtml(text).replace(/\n/g, "<br>")}</p>
    </div>
  `;
}

function renderBody(problem) {
  const lcUrl = getProblemLeetcodeUrl(problem);
  const solveTime = problem.actualSolveMinutes != null
    ? formatMinutes(problem.actualSolveMinutes)
    : "—";
  const solvedWhen = problem.solvedAt
    ? formatRelativeTime(problem.solvedAt)
    : formatRelativeTime(problem.updatedAt);
  const canAnalyze = hasSolutionCode(problem);

  return `
    <div class="solved-view" data-solved-view data-problem-id="${escapeAttr(problem.id)}">
      <header class="solved-view__head">
        <div>
          <h3 class="solved-view__title">${escapeHtml(problem.title)}</h3>
          <p class="solved-view__meta">
            ${escapeHtml(problem.topic || "—")} · ${escapeHtml(problem.pattern || "—")}
          </p>
        </div>
        <div class="solved-view__stats">
          ${DifficultyBadge(problem.difficulty)}
          <span class="solved-view__stat">
            <span class="solved-view__stat-label">Solve time</span>
            <span class="solved-view__stat-value">${escapeHtml(solveTime)}</span>
          </span>
          <span class="solved-view__stat">
            <span class="solved-view__stat-label">Solved</span>
            <span class="solved-view__stat-value">${escapeHtml(solvedWhen)}</span>
          </span>
        </div>
      </header>

      ${problem.approach?.trim() ? `
        <section class="solved-view__section solved-view__section--readonly">
          <h4 class="solved-view__section-title">My approach</h4>
          <p class="solved-view__approach">${escapeHtml(problem.approach).replace(/\n/g, "<br>")}</p>
        </section>
      ` : ""}

      <section class="solved-view__section solved-view__section--readonly">
        <h4 class="solved-view__section-title">Solution code</h4>
        ${renderCodeBlock(problem.solution)}
      </section>

      <section class="solved-view__section solved-view__section--actions">
        <div class="solved-view__section-head">
          <h4 class="solved-view__section-title">Complexity analysis</h4>
          ${canAnalyze ? `
            <button type="button" class="btn btn--ghost btn--xs" id="solved-analyze-btn">
              ${icon("zap")}<span>Analyze</span>
            </button>
          ` : ""}
        </div>
        <div id="solved-complexity-host">
          ${renderComplexityContent(problem)}
        </div>
        <p class="problem-ai-status" id="solved-complexity-status" aria-live="polite"></p>
      </section>

      <section class="solved-view__section solved-view__section--actions">
        <div class="solved-view__section-head">
          <h4 class="solved-view__section-title">Suggestions</h4>
          ${canAnalyze ? `
            <button type="button" class="btn btn--ghost btn--xs" id="solved-suggestions-btn">
              ${icon("zap")}<span>Generate</span>
            </button>
          ` : ""}
        </div>
        <div id="solved-suggestions-host">
          ${renderSuggestionsContent(problem.solutionSuggestions)}
        </div>
        <p class="problem-ai-status" id="solved-suggestions-status" aria-live="polite"></p>
      </section>

      ${!canAnalyze ? `
        <p class="solved-view__notice">Add solution code when marking Done to unlock analysis later.</p>
      ` : ""}

      ${lcUrl ? `
        <div class="solved-view__footer-link">
          <a href="${escapeHtml(lcUrl)}" class="btn btn--outline btn--sm" target="_blank" rel="noopener noreferrer">
            ${icon("externalLink")}<span>Open on LeetCode</span>
          </a>
        </div>
      ` : ""}
    </div>
  `;
}

function setAiStatus(host, id, message, type = "") {
  const el = host.querySelector(id);
  if (!el) return;
  el.textContent = message;
  el.className = `problem-ai-status${type ? ` problem-ai-status--${type}` : ""}`;
}

function patchComplexityHost(host, data) {
  const complexityHost = host.querySelector("#solved-complexity-host");
  if (complexityHost) {
    complexityHost.innerHTML = renderComplexityContent({
      timeComplexity: data.timeComplexity,
      spaceComplexity: data.spaceComplexity,
      complexityExplanation: data.explanation || data.complexityExplanation,
    });
  }
}

function patchSuggestionsHost(host, { combined, isOptimal }) {
  const suggestionsHost = host.querySelector("#solved-suggestions-host");
  if (suggestionsHost) {
    suggestionsHost.innerHTML = renderSuggestionsContent(combined, { isOptimal });
  }
}

async function persistAnalysisFields(problemId, patch) {
  const allowed = {};
  if (patch.timeComplexity !== undefined) allowed.timeComplexity = patch.timeComplexity;
  if (patch.spaceComplexity !== undefined) allowed.spaceComplexity = patch.spaceComplexity;
  if (patch.complexityExplanation !== undefined) allowed.complexityExplanation = patch.complexityExplanation;
  if (patch.solutionSuggestions !== undefined) allowed.solutionSuggestions = patch.solutionSuggestions;
  await updateProblem(problemId, allowed, { silent: true });
}

async function handleAnalyzeComplexity(host, problemId) {
  const problem = getProblem(problemId);
  if (!hasSolutionCode(problem)) return;

  const btn = host.querySelector("#solved-analyze-btn");
  btn?.classList.add("is-loading");
  if (btn) btn.disabled = true;
  setAiStatus(host, "#solved-complexity-status", "Analyzing…", "loading");

  try {
    const result = await analyzeComplexity({
      code: problem.solution,
      title: problem.title,
    });

    await persistAnalysisFields(problemId, {
      timeComplexity: result.timeComplexity,
      spaceComplexity: result.spaceComplexity,
      complexityExplanation: result.explanation || "",
    });

    patchComplexityHost(host, result);
    setAiStatus(host, "#solved-complexity-status", "Saved.", "success");
    refreshPage();
  } catch (err) {
    setAiStatus(host, "#solved-complexity-status", err?.message || "Analysis failed.", "error");
  } finally {
    btn?.classList.remove("is-loading");
    if (btn) btn.disabled = false;
  }
}

async function handleGenerateSuggestions(host, problemId) {
  const problem = getProblem(problemId);
  if (!hasSolutionCode(problem)) return;

  const btn = host.querySelector("#solved-suggestions-btn");
  btn?.classList.add("is-loading");
  if (btn) btn.disabled = true;
  setAiStatus(host, "#solved-suggestions-status", "Generating…", "loading");

  try {
    const result = await analyzeSolutionSuggestions({
      code: problem.solution,
      title: problem.title,
      timeComplexity: problem.timeComplexity,
      spaceComplexity: problem.spaceComplexity,
    });

    await persistAnalysisFields(problemId, {
      solutionSuggestions: result.combined || "",
    });

    patchSuggestionsHost(host, result);
    setAiStatus(host, "#solved-suggestions-status", "Saved.", "success");
  } catch (err) {
    setAiStatus(host, "#solved-suggestions-status", err?.message || "Could not generate suggestions.", "error");
  } finally {
    btn?.classList.remove("is-loading");
    if (btn) btn.disabled = false;
  }
}

function bindSolvedViewActions(host, problemId) {
  host.querySelector("#solved-analyze-btn")?.addEventListener("click", () => {
    void handleAnalyzeComplexity(host, problemId);
  });

  host.querySelector("#solved-suggestions-btn")?.addEventListener("click", () => {
    void handleGenerateSuggestions(host, problemId);
  });
}

function ensureHost() {
  let el = document.getElementById(`${MODAL_ID}-host`);
  if (!el) {
    el = document.createElement("div");
    el.id = `${MODAL_ID}-host`;
    document.body.appendChild(el);
  }
  return el;
}

export function openSolvedSolutionModal(problemId) {
  const problem = getProblem(problemId);
  if (!problem) {
    showToast(Toast({ title: "Problem not found", variant: "danger" }));
    return;
  }

  const host = ensureHost();
  host.innerHTML = Modal({
    id: MODAL_ID,
    title: "Solved solution",
    size: "lg",
    className: "modal--problem modal--solved-view",
    body: renderBody(problem),
    footer: Button({ label: "Close", variant: "ghost", attrs: "data-modal-close type='button'" }),
  });

  initModals(host);
  bindSolvedViewActions(host, problemId);
  openModal(MODAL_ID);
}

export function initSolvedSolutionTriggers(root = document) {
  if (root.dataset.solvedViewBound) return;
  root.dataset.solvedViewBound = "true";

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='view-solved-solution']");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openSolvedSolutionModal(btn.dataset.id);
  });
}