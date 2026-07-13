/**
 * Read-only view of a solved problem's saved solution, complexity, and suggestions.
 */

import { icon } from "./icons.js";
import { Modal, Button, DifficultyBadge } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import { getProblem } from "../storage/db.js";
import { getProblemLeetcodeUrl } from "./leetcode-actions.js";
import { formatMinutes, formatRelativeTime } from "../storage/helpers.js";
import { showToast, Toast } from "./ui/index.js";

const MODAL_ID = "solved-solution-modal";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderCodeBlock(code) {
  if (!code?.trim()) {
    return `<p class="solved-view__empty">No solution code saved.</p>`;
  }
  return `<pre class="solved-view__code"><code>${escapeHtml(code)}</code></pre>`;
}

function renderComplexityBlock(problem) {
  const time = problem.timeComplexity?.trim();
  const space = problem.spaceComplexity?.trim();
  const explanation = problem.complexityExplanation?.trim();

  if (!time && !space && !explanation) {
    return `<p class="solved-view__empty">No complexity analysis saved.</p>`;
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

function renderSuggestionsBlock(text) {
  if (!text?.trim()) {
    return `<p class="solved-view__empty">No suggestions were recorded.</p>`;
  }
  return `<p class="solved-view__suggestions-text">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

function renderBody(problem) {
  const lcUrl = getProblemLeetcodeUrl(problem);
  const solveTime = problem.actualSolveMinutes != null
    ? formatMinutes(problem.actualSolveMinutes)
    : "—";
  const solvedWhen = problem.solvedAt
    ? formatRelativeTime(problem.solvedAt)
    : formatRelativeTime(problem.updatedAt);

  return `
    <div class="solved-view">
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
        <section class="solved-view__section">
          <h4 class="solved-view__section-title">My approach</h4>
          <p class="solved-view__approach">${escapeHtml(problem.approach).replace(/\n/g, "<br>")}</p>
        </section>
      ` : ""}

      <section class="solved-view__section">
        <h4 class="solved-view__section-title">Solution code</h4>
        ${renderCodeBlock(problem.solution)}
      </section>

      <section class="solved-view__section">
        <h4 class="solved-view__section-title">Complexity analysis</h4>
        ${renderComplexityBlock(problem)}
      </section>

      <section class="solved-view__section">
        <h4 class="solved-view__section-title">Suggestions</h4>
        ${renderSuggestionsBlock(problem.solutionSuggestions)}
      </section>

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