/**
 * Solution completion dialog — opened when marking a problem Done after solving.
 */

import { icon } from "./icons.js";
import { Modal, Button, Field } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import {
  getProblem,
  markProblemSolved,
  completeMissionWithSolution,
} from "../storage/db.js";
import {
  validateSolutionCode,
  analyzeComplexity,
  analyzeSolutionSuggestions,
} from "../api/problemAiApi.js";
import { formatElapsedLive } from "../storage/helpers.js";
import { debounce } from "../utils.js";
import { refreshPage } from "../controllers/page-controller.js";
import { showToast, Toast } from "./ui/index.js";
import {
  extractSolutionCodeForAnalysis,
  isTrivialFakeCode,
} from "../utils/solution-code.js";

const MODAL_ID = "solution-complete-modal";
const CODE_VALIDATE_DEBOUNCE_MS = 700;

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

function renderComplexityResult(time = "", space = "", explanation = "") {
  if (!time && !space) return "";
  return `
    <div class="problem-complexity__result" id="solve-complexity-result">
      <div class="problem-complexity__badges">
        ${time ? `<span class="badge badge--accent">Time: ${escapeHtml(time)}</span>` : ""}
        ${space ? `<span class="badge badge--info">Space: ${escapeHtml(space)}</span>` : ""}
      </div>
      ${explanation ? `<p class="problem-complexity__explanation">${escapeHtml(explanation)}</p>` : ""}
    </div>
  `;
}

function renderSuggestionsBox(content = "", { isOptimal = false, loading = false } = {}) {
  if (loading) {
    return `
      <div class="solve-complete__suggestions solve-complete__suggestions--loading" id="solve-suggestions-box">
        <h4 class="solve-complete__suggestions-title">Suggestions</h4>
        <p class="problem-ai-status problem-ai-status--loading">Analyzing your solution for improvements…</p>
      </div>
    `;
  }

  if (!content) {
    return `
      <div class="solve-complete__suggestions solve-complete__suggestions--empty" id="solve-suggestions-box" hidden>
        <h4 class="solve-complete__suggestions-title">Suggestions</h4>
        <p class="solve-complete__suggestions-text" id="solve-suggestions-text"></p>
      </div>
    `;
  }

  return `
    <div class="solve-complete__suggestions${isOptimal ? " solve-complete__suggestions--optimal" : ""}" id="solve-suggestions-box">
      <h4 class="solve-complete__suggestions-title">${isOptimal ? "Looks good" : "Suggestions"}</h4>
      <p class="solve-complete__suggestions-text" id="solve-suggestions-text">${escapeHtml(content).replace(/\n/g, "<br>")}</p>
    </div>
  `;
}

function renderModalBody(problem) {
  const elapsed = problem?.startedAt
    ? formatElapsedLive(Date.now() - new Date(problem.startedAt).getTime())
    : "—";

  return `
    <div class="solve-complete" data-solve-complete>
      <header class="solve-complete__head">
        <div>
          <p class="solve-complete__label">Problem solved</p>
          <h3 class="solve-complete__title">${escapeHtml(problem?.title || "Problem")}</h3>
        </div>
        <div class="solve-complete__timer" aria-live="polite">
          <span class="solve-complete__timer-label">Time taken</span>
          <span class="solve-complete__timer-value" id="solve-elapsed-display" data-started-at="${escapeAttr(problem?.startedAt || "")}">${elapsed}</span>
        </div>
      </header>

      <p class="solve-complete__intro">
        Paste your accepted solution below. Groq verifies the code, then you can analyze complexity and get improvement tips.
      </p>

      ${Field({
        label: "My approach",
        hint: "Optional — your plan or key insight",
        children: `<textarea
          class="textarea problem-approach-input"
          id="solve-approach"
          rows="3"
          placeholder="e.g. Two pointers from both ends…"
        >${escapeHtml(problem?.approach || "")}</textarea>`,
      })}

      ${Field({
        label: "Solution code",
        hint: "Required — paste your final accepted code",
        children: `<textarea
          class="textarea problem-code-input"
           id="solve-solution"
          rows="10"
          placeholder="class Solution {&#10;    public int[] twoSum(int[] nums, int target) {&#10;        // ...&#10;    }&#10;}"
        >${escapeHtml(problem?.solution || "")}</textarea>`,
      })}

      <div class="problem-complexity" id="solve-complexity-section">
        <div class="problem-complexity__actions">
          <button class="btn btn--ghost btn--sm" type="button" id="solve-analyze-btn" disabled>
            ${icon("zap")}
            <span>Analyze Complexity</span>
          </button>
          <span class="problem-complexity__hint" id="solve-complexity-hint">Paste solution code — Groq verifies it before analysis</span>
        </div>
        <p class="problem-ai-status" id="solve-complexity-status" aria-live="polite"></p>
        <div id="solve-complexity-result-host"></div>
        <input type="hidden" id="solve-time-complexity" value="${escapeAttr(problem?.timeComplexity || "")}">
        <input type="hidden" id="solve-space-complexity" value="${escapeAttr(problem?.spaceComplexity || "")}">
        <input type="hidden" id="solve-complexity-explanation" value="${escapeAttr(problem?.complexityExplanation || "")}">
      </div>

      <div id="solve-suggestions-host">
        ${renderSuggestionsBox()}
      </div>

      <p class="problem-ai-status" id="solve-submit-status" aria-live="polite"></p>
    </div>
  `;
}

function getModalHtml(problem) {
  return Modal({
    id: MODAL_ID,
    title: "Mark as Done",
    size: "lg",
    className: "modal--problem modal--solve-complete",
    body: renderModalBody(problem),
    footer: `
      <div class="problem-form__footer">
        <div class="problem-form__footer-start"></div>
        <div class="problem-form__footer-end">
          ${Button({ label: "Cancel", variant: "ghost", attrs: "data-modal-close type='button'" })}
          ${Button({
            label: "Mark as Done",
            variant: "primary",
            attrs: 'id="solve-complete-submit" type="button" disabled',
          })}
        </div>
      </div>
    `,
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

function setAiStatus(host, id, message, type = "") {
  const el = host.querySelector(id);
  if (!el) return;
  el.textContent = message;
  el.className = `problem-ai-status${type ? ` problem-ai-status--${type}` : ""}`;
}

function setAnalyzeUi(host, { disabled, hint }) {
  const btn = host.querySelector("#solve-analyze-btn");
  const hintEl = host.querySelector("#solve-complexity-hint");
  if (btn) btn.disabled = disabled;
  if (hintEl && hint) hintEl.textContent = hint;
}

function setSubmitEnabled(host, enabled) {
  const btn = host.querySelector("#solve-complete-submit");
  if (btn) btn.disabled = !enabled;
}

function getExtractedCode(raw) {
  const extracted = extractSolutionCodeForAnalysis(raw);
  return { extracted, code: extracted.code?.trim() || "" };
}

function applyComplexityResult(host, { timeComplexity, spaceComplexity, explanation }) {
  host.querySelector("#solve-time-complexity").value = timeComplexity || "";
  host.querySelector("#solve-space-complexity").value = spaceComplexity || "";
  host.querySelector("#solve-complexity-explanation").value = explanation || "";

  const hostEl = host.querySelector("#solve-complexity-result-host");
  if (hostEl) {
    hostEl.innerHTML = renderComplexityResult(timeComplexity, spaceComplexity, explanation);
  }
}

function applySuggestions(host, { combined, isOptimal }) {
  const suggestionsHost = host.querySelector("#solve-suggestions-host");
  if (!suggestionsHost) return;
  suggestionsHost.innerHTML = renderSuggestionsBox(combined, { isOptimal });
  host._suggestionsText = combined || "";
}

async function runCodeValidation(host) {
  const raw = host.querySelector("#solve-solution")?.value?.trim() || "";

  host._codeValidateAbort?.abort();
  host._codeValidateAbort = new AbortController();
  const requestId = ++host._codeValidateSeq;

  if (!raw) {
    host._codeValid = false;
    host._lastValidatedCode = "";
    setAnalyzeUi(host, { disabled: true, hint: "Paste your accepted solution code" });
    setSubmitEnabled(host, false);
    return;
  }

  const { extracted, code } = getExtractedCode(raw);

  if (!code) {
    host._codeValid = false;
    host._lastValidatedCode = "";
    setAnalyzeUi(host, {
      disabled: true,
      hint: extracted.reason === "prose"
        ? "Approach-style text belongs in My approach — paste code here"
        : "Paste your accepted solution code first",
    });
    setSubmitEnabled(host, false);
    return;
  }

  if (isTrivialFakeCode(code)) {
    host._codeValid = false;
    host._lastValidatedCode = code;
    setAnalyzeUi(host, { disabled: true, hint: "Add real solution code — braces alone are not valid" });
    setSubmitEnabled(host, false);
    return;
  }

  if (host._lastValidatedCode === code && host._codeValid === true) {
    setAnalyzeUi(host, { disabled: false, hint: host._codeValidHint || "Valid code — ready to analyze" });
    setSubmitEnabled(host, true);
    return;
  }

  if (host._lastValidatedCode === code && host._codeValid === false) {
    setAnalyzeUi(host, { disabled: true, hint: host._codeInvalidHint || "Invalid solution code" });
    setSubmitEnabled(host, false);
    return;
  }

  setAnalyzeUi(host, { disabled: true, hint: "Checking code with Groq…" });
  setSubmitEnabled(host, false);

  try {
    const result = await validateSolutionCode(
      { code },
      { signal: host._codeValidateAbort.signal, timeoutMs: 25_000 },
    );

    if (requestId !== host._codeValidateSeq) return;

    host._lastValidatedCode = code;
    host._codeValid = Boolean(result.isValidCode);

    if (result.isValidCode) {
      const lang = result.language ? `${result.language} ` : "";
      host._codeValidHint = `Valid ${lang}code — analyze complexity when ready`;
      setAnalyzeUi(host, { disabled: false, hint: host._codeValidHint });
      setSubmitEnabled(host, true);
      return;
    }

    host._codeInvalidHint = result.reason || "This doesn't look like real solution code";
    setAnalyzeUi(host, { disabled: true, hint: host._codeInvalidHint });
    setSubmitEnabled(host, false);
  } catch (err) {
    if (host._codeValidateAbort?.signal.aborted || requestId !== host._codeValidateSeq) return;
    host._codeValid = false;
    host._lastValidatedCode = code;
    host._codeInvalidHint = err?.message || "Could not verify code";
    setAnalyzeUi(host, { disabled: true, hint: host._codeInvalidHint });
    setSubmitEnabled(host, false);
  }
}

function scheduleCodeValidation(host) {
  clearTimeout(host._codeValidateTimer);
  host._codeValidateTimer = setTimeout(() => {
    void runCodeValidation(host);
  }, CODE_VALIDATE_DEBOUNCE_MS);
}

async function fetchSuggestions(host, problem) {
  const code = host.querySelector("#solve-solution")?.value?.trim() || "";
  const timeComplexity = host.querySelector("#solve-time-complexity")?.value?.trim() || "";
  const spaceComplexity = host.querySelector("#solve-space-complexity")?.value?.trim() || "";

  const suggestionsHost = host.querySelector("#solve-suggestions-host");
  if (suggestionsHost) {
    suggestionsHost.innerHTML = renderSuggestionsBox("", { loading: true });
  }

  try {
    const result = await analyzeSolutionSuggestions({
      code,
      title: problem?.title,
      timeComplexity,
      spaceComplexity,
    });
    applySuggestions(host, result);
    host._suggestionsText = result.combined || "";
    return result;
  } catch (err) {
    if (suggestionsHost) {
      suggestionsHost.innerHTML = renderSuggestionsBox();
    }
    setAiStatus(host, "#solve-complexity-status", err?.message || "Could not load suggestions.", "error");
    host._suggestionsText = "";
    return null;
  }
}

async function handleAnalyzeComplexity(host, problem) {
  const btn = host.querySelector("#solve-analyze-btn");
  const raw = host.querySelector("#solve-solution")?.value?.trim() || "";
  const { code } = getExtractedCode(raw);

  if (!code || !host._codeValid || host._lastValidatedCode !== code) {
    setAiStatus(host, "#solve-complexity-status", "Waiting for valid solution code…", "error");
    await runCodeValidation(host);
    if (!host._codeValid) return;
  }

  btn?.classList.add("is-loading");
  btn.disabled = true;
  setAiStatus(host, "#solve-complexity-status", "Analyzing complexity with Groq…", "loading");

  try {
    const result = await analyzeComplexity({ code, title: problem?.title });
    applyComplexityResult(host, result);
    setAiStatus(host, "#solve-complexity-status", "Complexity analyzed — fetching suggestions…", "success");
    host._complexityAnalyzed = true;
    await fetchSuggestions(host, problem);
    setAiStatus(host, "#solve-complexity-status", "Complexity and suggestions ready.", "success");
  } catch (err) {
    setAiStatus(host, "#solve-complexity-status", err?.message || "Analysis failed.", "error");
  } finally {
    btn?.classList.remove("is-loading");
    if (host._codeValid) btn.disabled = false;
  }
}

function startElapsedTicker(host) {
  stopElapsedTicker(host);
  const display = host.querySelector("#solve-elapsed-display");
  const startedAt = display?.dataset.startedAt;
  if (!display || !startedAt) return;

  const tick = () => {
    const elapsed = Date.now() - new Date(startedAt).getTime();
    display.textContent = formatElapsedLive(elapsed);
  };

  tick();
  host._elapsedTimer = window.setInterval(tick, 1000);
}

function stopElapsedTicker(host) {
  if (host._elapsedTimer) {
    clearInterval(host._elapsedTimer);
    host._elapsedTimer = null;
  }
}

function readSolutionData(host) {
  return {
    approach: host.querySelector("#solve-approach")?.value?.trim() || "",
    solution: host.querySelector("#solve-solution")?.value?.trim() || "",
    timeComplexity: host.querySelector("#solve-time-complexity")?.value?.trim() || "",
    spaceComplexity: host.querySelector("#solve-space-complexity")?.value?.trim() || "",
    complexityExplanation: host.querySelector("#solve-complexity-explanation")?.value?.trim() || "",
    solutionSuggestions: host._suggestionsText || "",
  };
}

async function handleSubmit(host, { problemId, mode }) {
  const submitBtn = host.querySelector("#solve-complete-submit");
  const raw = host.querySelector("#solve-solution")?.value?.trim() || "";

  if (!raw) {
    setAiStatus(host, "#solve-submit-status", "Paste your solution code to continue.", "error");
    return;
  }

  if (!host._codeValid) {
    setAiStatus(host, "#solve-submit-status", "Waiting for valid solution code…", "loading");
    await runCodeValidation(host);
    if (!host._codeValid) {
      setAiStatus(host, "#solve-submit-status", host._codeInvalidHint || "Invalid solution code.", "error");
      return;
    }
  }

  const solutionData = readSolutionData(host);
  submitBtn.disabled = true;
  setAiStatus(host, "#solve-submit-status", "Saving your solution…", "loading");

  try {
    const result = mode === "mission"
      ? await completeMissionWithSolution(problemId, solutionData)
      : await markProblemSolved(problemId, solutionData);

    stopElapsedTicker(host);
    closeModal();
    host.innerHTML = "";

    try {
      sessionStorage.setItem("dsa-problems-tab", "solved");
    } catch {
      /* ignore */
    }

    const mins = result?.actualSolveMinutes;
    showToast(Toast({
      title: "Marked done",
      text: mins ? `Recorded ${mins} minute${mins !== 1 ? "s" : ""} with your solution.` : "Solution saved for revision.",
      variant: "success",
    }));
    refreshPage();
  } catch (err) {
    setAiStatus(host, "#solve-submit-status", err?.message || "Could not save.", "error");
    submitBtn.disabled = false;
  }
}

function bindModal(host, problem, options) {
  host.querySelector("#solve-solution")?.addEventListener("input", () => {
    host._complexityAnalyzed = false;
    host._suggestionsText = "";
    const suggestionsHost = host.querySelector("#solve-suggestions-host");
    if (suggestionsHost) suggestionsHost.innerHTML = renderSuggestionsBox();
    host.querySelector("#solve-complexity-result-host").innerHTML = "";
    scheduleCodeValidation(host);
  });

  host.querySelector("#solve-analyze-btn")?.addEventListener("click", () => {
    void handleAnalyzeComplexity(host, problem);
  });

  host.querySelector("#solve-complete-submit")?.addEventListener("click", () => {
    void handleSubmit(host, options);
  });

  host.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => stopElapsedTicker(host));
  });

  startElapsedTicker(host);

  if (problem?.solution?.trim()) {
    scheduleCodeValidation(host);
  }
}

/**
 * @param {string} problemId
 * @param {{ mode?: 'solved' | 'mission' }} [options]
 */
export function openSolutionCompleteModal(problemId, { mode = "solved" } = {}) {
  const problem = getProblem(problemId);
  if (!problem) {
    showToast(Toast({ title: "Problem not found", variant: "danger" }));
    return;
  }

  const host = ensureHost();
  host.innerHTML = getModalHtml(problem);
  initModals(host);

  host._codeValidateSeq = 0;
  host._codeValid = false;
  host._lastValidatedCode = "";
  host._complexityAnalyzed = false;
  host._suggestionsText = problem.solutionSuggestions || "";

  bindModal(host, problem, { problemId, mode });
  openModal(MODAL_ID);
}