/**
 * Shared problem add/edit/delete modal with LeetCode auto-fill & AI helpers
 */

import { icon } from "./icons.js";
import { Modal, Button, Field, Input } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import {
  createProblem,
  updateProblem,
  deleteProblem,
  getProblem,
} from "../storage/db.js";
import { PATTERN_CATALOG, DIFFICULTIES, STATUSES, MISSION_TYPES } from "../storage/patterns-catalog.js";
import {
  fetchLeetcodeProblem,
  parseLeetcodeSlug,
  parseLeetcodeUrlOffline,
  buildLeetcodeUrl,
  slugToTitle,
} from "../services/leetcode.js";
import { detectPattern, analyzeComplexity } from "../api/problemAiApi.js";
import { canAccessProblemAi } from "../auth/access.js";
import { getSessionUser } from "../auth/session.js";
import { debounce } from "../utils.js";
import { refreshPage } from "../controllers/page-controller.js";
import { openUpgradeModal } from "./upgrade-modal.js";

const MODAL_ID = "problem-modal";

function selectOptions(items, selected) {
  return items.map((item) => {
    const val = typeof item === "string" ? item : item.name;
    const label = typeof item === "string" ? item : item.name;
    return `<option value="${val}"${val === selected ? " selected" : ""}>${label}</option>`;
  }).join("");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderLeetcodePreview(meta) {
  if (!meta) return "";
  return `
    <div class="leetcode-preview animate-fade-in" id="leetcode-preview">
      <div class="leetcode-preview__header">
        <span class="leetcode-preview__badge">LeetCode</span>
        ${meta.leetcodeId ? `<span class="leetcode-preview__id">#${meta.leetcodeId}</span>` : ""}
        ${meta.isPaidOnly ? `<span class="leetcode-preview__premium">Premium</span>` : ""}
      </div>
      <div class="leetcode-preview__title">${meta.title || "Problem found"}</div>
      ${meta.topicTags?.length ? `
        <div class="leetcode-preview__tags">
          ${meta.topicTags.map((t) => `<span class="badge badge--accent badge--sm">${t}</span>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderPatternSuggestion() {
  return `
    <div class="problem-ai-suggestion" id="pattern-suggestion" hidden>
      <div class="problem-ai-suggestion__text">
        AI suggests: <strong id="pattern-suggestion-name"></strong>
      </div>
      <p class="problem-ai-suggestion__reason" id="pattern-suggestion-reason"></p>
      <div class="problem-ai-suggestion__actions">
        <button class="btn btn--primary btn--xs" type="button" id="pattern-accept-btn">Use this</button>
        <button class="btn btn--ghost btn--xs" type="button" id="pattern-dismiss-btn">Dismiss</button>
      </div>
    </div>
    <p class="problem-ai-status" id="pattern-ai-status" aria-live="polite"></p>
  `;
}

function renderComplexityResult(time = "", space = "", explanation = "") {
  if (!time && !space) return "";
  return `
    <div class="problem-complexity__result" id="complexity-result">
      <div class="problem-complexity__badges">
        ${time ? `<span class="badge badge--accent">Time: ${escapeHtml(time)}</span>` : ""}
        ${space ? `<span class="badge badge--info">Space: ${escapeHtml(space)}</span>` : ""}
      </div>
      ${explanation ? `<p class="problem-complexity__explanation">${escapeHtml(explanation)}</p>` : ""}
    </div>
  `;
}

function renderLockedAiButton({ id, label, size = "sm" }) {
  return `
    <button
      class="btn btn--ghost btn--${size} problem-ai-btn--locked"
      type="button"
      id="${id}"
      data-action="upgrade-ai"
      title="Upgrade to Premium to unlock this AI feature"
    >
      ${icon("lock")}
      <span>${label}</span>
    </button>
  `;
}

function renderSolutionSection(p = {}, { aiLocked = false } = {}) {
  const hasSolution = Boolean(p.solution?.trim());
  const isOpen = hasSolution;

  return `
    <div class="problem-optional-section${isOpen ? " is-open" : ""}" id="solution-section">
      <button
        type="button"
        class="problem-optional-section__toggle"
        id="solution-toggle-btn"
        aria-expanded="${isOpen}"
        aria-controls="solution-panel"
      >
        ${icon(isOpen ? "chevronDown" : "plus")}
        <span>${isOpen ? "My Solution" : "Add My Solution"}</span>
        <span class="problem-optional-section__toggle-chevron" aria-hidden="true">${icon("chevronDown")}</span>
      </button>
      <div class="problem-optional-section__panel" id="solution-panel" ${isOpen ? "" : "hidden"}>
        ${Field({
          label: "",
          hint: "Optional — paste your accepted solution (any language)",
          children: `<textarea
            class="textarea problem-code-input"
            name="solution"
            id="problem-solution"
            rows="8"
            placeholder="class Solution {&#10;public:&#10;    vector&lt;int&gt; twoSum(vector&lt;int&gt;&amp; nums, int target) {&#10;        // ...&#10;    }&#10;};"
          >${escapeHtml(p.solution || "")}</textarea>`,
        })}
        <div class="problem-complexity" id="complexity-section">
          <div class="problem-complexity__actions">
            ${aiLocked
              ? renderLockedAiButton({ id: "analyze-complexity-btn", label: "Analyze Complexity" })
              : `<button class="btn btn--ghost btn--sm" type="button" id="analyze-complexity-btn" disabled>
                  ${icon("zap")}
                  <span>Analyze Complexity</span>
                </button>`}
            <span class="problem-complexity__hint" id="complexity-hint">${aiLocked ? "Premium unlocks AI complexity analysis" : "Paste code above, then analyze with AI"}</span>
          </div>
          <p class="problem-ai-status" id="complexity-ai-status" aria-live="polite"></p>
          <div id="complexity-result-host">
            ${renderComplexityResult(p.timeComplexity, p.spaceComplexity)}
          </div>
          <div class="problem-complexity__manual ds-grid md:grid-cols-2 gap-3">
            ${Field({
              label: "Time complexity",
              hint: "e.g. O(n), O(n log n)",
              children: Input({
                placeholder: "O(n)",
                value: p.timeComplexity || "",
                attrs: 'name="timeComplexity" id="time-complexity" autocomplete="off"',
              }),
            })}
            ${Field({
              label: "Space complexity",
              hint: "e.g. O(1), O(n)",
              children: Input({
                placeholder: "O(1)",
                value: p.spaceComplexity || "",
                attrs: 'name="spaceComplexity" id="space-complexity" autocomplete="off"',
              }),
            })}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderForm(problem = null, { aiLocked = false } = {}) {
  const p = problem || {};
  const lcUrl = p.leetcodeUrl || (p.leetcodeSlug ? buildLeetcodeUrl(p.leetcodeSlug) : "");
  const showDetect = Boolean(p.title && lcUrl);

  return `
    <form id="problem-form" class="stack stack-md">
      <input type="hidden" name="id" value="${p.id || ""}">
      <input type="hidden" name="leetcodeSlug" value="${p.leetcodeSlug || ""}">
      <input type="hidden" name="leetcodeId" value="${p.leetcodeId || ""}">
      <input type="hidden" name="topicTags" value="${(p.topicTags || []).join(",")}">

      <div class="leetcode-import">
        <div class="leetcode-import__header">
          <label class="field__label" for="leetcode-url">LeetCode link</label>
          <span class="leetcode-import__hint">Paste a URL to auto-fill title, difficulty & tags</span>
        </div>
        <div class="leetcode-import__row">
          <div class="leetcode-import__input-wrap">
            <span class="search-icon" aria-hidden="true">${icon("link")}</span>
            <input
              type="url"
              class="input leetcode-url-input"
              id="leetcode-url"
              name="leetcodeUrl"
              placeholder="https://leetcode.com/problems/two-sum/"
              value="${lcUrl}"
              autocomplete="off"
            />
          </div>
          <button class="btn btn--secondary" type="button" id="leetcode-fetch-btn">
            ${icon("search")}
            <span>Fetch</span>
          </button>
        </div>
        <p class="leetcode-import__status" id="leetcode-status" aria-live="polite"></p>
        <div id="leetcode-preview-host">${p.title && lcUrl ? renderLeetcodePreview({ ...p, topicTags: p.topicTags }) : ""}</div>
      </div>

      <div class="divider divider--subtle"></div>

      ${Field({ label: "Problem title", children: Input({ placeholder: "e.g. Two Sum", value: p.title || "", attrs: 'name="title" id="problem-title" required' }) })}

      <div class="ds-grid md:grid-cols-2 gap-4">
        ${Field({ label: "Topic", children: Input({ placeholder: "e.g. Array · Hash Table", value: p.topic || "", attrs: 'name="topic" id="problem-topic"' }) })}
        <div class="field">
          <div class="problem-field-header">
            <label class="field__label" for="problem-pattern">Pattern</label>
            ${aiLocked
              ? `<span id="detect-pattern-btn-wrap" ${showDetect ? "" : "hidden"}>${renderLockedAiButton({ id: "detect-pattern-btn", label: "Auto Detect", size: "xs" })}</span>`
              : `<button
                  class="btn btn--ghost btn--xs"
                  type="button"
                  id="detect-pattern-btn"
                  ${showDetect ? "" : "hidden"}
                >
                  ${icon("zap")}
                  <span>Auto Detect</span>
                </button>`}
          </div>
          <select class="select" name="pattern" id="problem-pattern">
            <option value="">Select pattern</option>
            ${selectOptions(PATTERN_CATALOG, p.pattern)}
          </select>
          ${renderPatternSuggestion()}
        </div>
      </div>

      <div class="ds-grid md:grid-cols-2 gap-4">
        ${Field({
          label: "Difficulty",
          children: `<select class="select" name="difficulty" id="problem-difficulty">${selectOptions(DIFFICULTIES, p.difficulty || "Medium")}</select>`,
        })}
        ${Field({
          label: "Status",
          children: `<select class="select" name="status">${selectOptions(STATUSES, p.status || "todo")}</select>`,
        })}
      </div>
      <div class="ds-grid md:grid-cols-2 gap-4">
        ${Field({ label: "Est. time (min)", children: Input({ type: "number", value: p.estimatedMinutes || 30, attrs: 'name="estimatedMinutes" id="problem-time" min="5" max="180"' }) })}
        ${Field({ label: "Attempts", children: Input({ type: "number", value: p.attempts || 0, attrs: 'name="attempts" min="0"' }) })}
      </div>
      <div class="ds-grid md:grid-cols-2 gap-4">
        <label class="checkbox">
          <input type="checkbox" name="inMission" ${p.inMission ? "checked" : ""}>
          <span>Add to today's mission</span>
        </label>
        ${Field({
          label: "Mission type",
          children: `<select class="select" name="missionType">
            <option value="">None</option>
            ${selectOptions(MISSION_TYPES, p.missionType || "new")}
          </select>`,
        })}
      </div>

      ${renderSolutionSection(p, { aiLocked })}
    </form>
  `;
}

function getModalHTML(problem = null) {
  const isEdit = Boolean(problem?.id);
  const lcUrl = getProblemLeetcodeUrl(problem);
  const aiLocked = !canAccessProblemAi(getSessionUser());

  return Modal({
    id: MODAL_ID,
    title: isEdit ? "Edit Problem" : "Add New Problem",
    size: "lg",
    body: renderForm(problem, { aiLocked }),
    footer: `
      <div class="modal__footer--between" style="display:flex;width:100%;align-items:center;justify-content:space-between">
        <div class="cluster">
          ${isEdit ? Button({ label: "Delete", variant: "danger", attrs: 'id="problem-delete-btn" type="button"' }) : ""}
          ${isEdit && lcUrl ? `<a href="${lcUrl}" class="btn btn--outline btn--sm" target="_blank" rel="noopener noreferrer">${icon("externalLink")}<span>Open LeetCode</span></a>` : ""}
        </div>
        <div class="cluster">
          ${Button({ label: "Cancel", variant: "ghost", attrs: "data-modal-close type='button'" })}
          ${Button({ label: isEdit ? "Save Changes" : "Add Problem", attrs: 'id="problem-save-btn" type="button"' })}
        </div>
      </div>
    `,
  });
}

function getProblemLeetcodeUrl(problem) {
  if (!problem) return null;
  return problem.leetcodeUrl || buildLeetcodeUrl(problem.leetcodeSlug);
}

function setStatus(host, message, type = "") {
  const el = host.querySelector("#leetcode-status");
  if (!el) return;
  el.textContent = message;
  el.className = `leetcode-import__status${type ? ` leetcode-import__status--${type}` : ""}`;
}

function setAiStatus(host, id, message, type = "") {
  const el = host.querySelector(id);
  if (!el) return;
  el.textContent = message;
  el.className = `problem-ai-status${type ? ` problem-ai-status--${type}` : ""}`;
}

function applyMetadata(host, meta) {
  const form = host.querySelector("#problem-form");
  if (!form || !meta) return;

  const setVal = (name, val) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el && val != null && val !== "") el.value = val;
  };

  const setSelect = (id, val) => {
    const el = form.querySelector(`#${id}`);
    if (el && val) el.value = val;
  };

  if (meta.title) setVal("title", meta.title);
  if (meta.topic) setVal("topic", meta.topic);
  if (meta.pattern) setSelect("problem-pattern", meta.pattern);
  if (meta.difficulty) setSelect("problem-difficulty", meta.difficulty);
  if (meta.estimatedMinutes) setVal("estimatedMinutes", meta.estimatedMinutes);
  if (meta.leetcodeUrl) setVal("leetcodeUrl", meta.leetcodeUrl);
  if (meta.leetcodeSlug) setVal("leetcodeSlug", meta.leetcodeSlug);
  if (meta.leetcodeId) setVal("leetcodeId", meta.leetcodeId);
  if (meta.topicTags) setVal("topicTags", meta.topicTags.join(","));

  const previewHost = host.querySelector("#leetcode-preview-host");
  if (previewHost) {
    previewHost.innerHTML = renderLeetcodePreview(meta);
  }

  host._lastLcMeta = meta;
  showDetectPatternBtn(host, true);
  hidePatternSuggestion(host);
}

function showDetectPatternBtn(host, show) {
  const btn = host.querySelector("#detect-pattern-btn");
  const wrap = host.querySelector("#detect-pattern-btn-wrap");
  if (wrap) wrap.hidden = !show;
  else if (btn) btn.hidden = !show;
}

function hidePatternSuggestion(host) {
  const el = host.querySelector("#pattern-suggestion");
  if (el) el.hidden = true;
  setAiStatus(host, "#pattern-ai-status", "");
}

function showPatternSuggestion(host, { primary, reasoning }) {
  const el = host.querySelector("#pattern-suggestion");
  const nameEl = host.querySelector("#pattern-suggestion-name");
  const reasonEl = host.querySelector("#pattern-suggestion-reason");

  if (nameEl) nameEl.textContent = primary;
  if (reasonEl) reasonEl.textContent = reasoning || "";
  if (el) {
    el.hidden = false;
    el.dataset.pattern = primary;
  }
  setAiStatus(host, "#pattern-ai-status", "");
}

function toggleSolutionPanel(host, open) {
  const section = host.querySelector("#solution-section");
  const panel = host.querySelector("#solution-panel");
  const btn = host.querySelector("#solution-toggle-btn");
  const label = btn?.querySelector("span");

  if (!section || !panel || !btn) return;

  section.classList.toggle("is-open", open);
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));

  if (label) label.textContent = open ? "My Solution" : "Add My Solution";

  if (open) {
    updateAnalyzeButtonState(host);
    host.querySelector("#problem-solution")?.focus();
  }
}

function updateAnalyzeButtonState(host) {
  if (host._aiLocked) return;

  const code = host.querySelector("#problem-solution")?.value?.trim();
  const btn = host.querySelector("#analyze-complexity-btn");
  const hint = host.querySelector("#complexity-hint");

  if (btn) btn.disabled = !code || code.length < 8;
  if (hint) {
    hint.textContent = code && code.length >= 8
      ? "AI will estimate time & space complexity"
      : "Paste code above, then analyze with AI";
  }
}

function applyComplexityResult(host, { timeComplexity, spaceComplexity, explanation }) {
  const timeInput = host.querySelector("#time-complexity");
  const spaceInput = host.querySelector("#space-complexity");
  const hostEl = host.querySelector("#complexity-result-host");
  const section = host.querySelector("#complexity-section");

  if (timeInput) timeInput.value = timeComplexity;
  if (spaceInput) spaceInput.value = spaceComplexity;
  if (hostEl) {
    hostEl.innerHTML = renderComplexityResult(timeComplexity, spaceComplexity, explanation);
  }
  section?.classList.remove("is-manual");
}

function syncComplexityPreview(host) {
  const time = host.querySelector("#time-complexity")?.value?.trim() || "";
  const space = host.querySelector("#space-complexity")?.value?.trim() || "";
  const hostEl = host.querySelector("#complexity-result-host");

  if (!hostEl) return;
  hostEl.innerHTML = time || space ? renderComplexityResult(time, space) : "";
}

function focusManualPattern(host) {
  const select = host.querySelector("#problem-pattern");
  select?.focus();
  select?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function focusManualComplexity(host) {
  const section = host.querySelector("#complexity-section");
  section?.classList.add("is-manual");
  const input = host.querySelector("#time-complexity");
  input?.focus();
  input?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function handleLeetcodeFetch(host, { force = false } = {}) {
  const urlInput = host.querySelector("#leetcode-url");
  const fetchBtn = host.querySelector("#leetcode-fetch-btn");
  const value = urlInput?.value?.trim();

  if (!value) {
    setStatus(host, "Paste a LeetCode problem URL first.", "error");
    return;
  }

  const slug = parseLeetcodeSlug(value);
  if (!slug) {
    setStatus(host, "Invalid URL. Use: https://leetcode.com/problems/two-sum/", "error");
    return;
  }

  if (!force && host._lastFetchedSlug === slug && host._lastLcMeta?.title) {
    applyMetadata(host, host._lastLcMeta);
    setStatus(host, `Already loaded "${host._lastLcMeta.title}".`, "success");
    return;
  }

  if (host._fetchInProgress) return;
  host._fetchInProgress = true;

  fetchBtn?.classList.add("is-loading");
  fetchBtn.disabled = true;
  fetchBtn.querySelector("span").textContent = "Fetching…";
  setStatus(host, "Fetching from LeetCode…", "loading");

  try {
    const meta = await fetchLeetcodeProblem(slug);
    host._lastFetchedSlug = slug;
    host._lastLcMeta = meta;
    applyMetadata(host, meta);

    if (meta.partial) {
      setStatus(host, meta.warning || `Loaded "${meta.title}" from URL — fill remaining fields or retry.`, "error");
    } else if (meta.cached) {
      setStatus(host, `Loaded "${meta.title}" (cached).`, "success");
    } else {
      setStatus(host, `Loaded "${meta.title}" — fields auto-filled.`, "success");
    }
  } catch (err) {
    const offline = parseLeetcodeUrlOffline(value) || {
      title: slugToTitle(slug),
      leetcodeUrl: buildLeetcodeUrl(slug),
      leetcodeSlug: slug,
      topicTags: [],
    };
    host._lastFetchedSlug = slug;
    host._lastLcMeta = offline;
    applyMetadata(host, offline);
    setStatus(host, `${err.message || "Could not fetch problem."} Title filled from URL — retry Fetch or edit manually.`, "error");
  } finally {
    host._fetchInProgress = false;
    fetchBtn?.classList.remove("is-loading");
    fetchBtn.disabled = false;
    const label = fetchBtn?.querySelector("span");
    if (label) label.textContent = "Fetch";
  }
}

async function handleDetectPattern(host) {
  if (host._aiLocked) {
    openUpgradeModal();
    return;
  }

  const btn = host.querySelector("#detect-pattern-btn");
  const form = host.querySelector("#problem-form");
  const title = form?.querySelector("#problem-title")?.value?.trim();

  if (!title) {
    setAiStatus(host, "#pattern-ai-status", "Enter or fetch a problem title first.", "error");
    return;
  }

  const meta = host._lastLcMeta || {};
  const topicTagsRaw = form.querySelector('[name="topicTags"]')?.value || "";
  const topicTags = topicTagsRaw
    ? topicTagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : (meta.topicTags || []);

  btn?.classList.add("is-loading");
  btn.disabled = true;
  hidePatternSuggestion(host);
  setAiStatus(host, "#pattern-ai-status", "Detecting pattern with AI…", "loading");

  try {
    const result = await detectPattern({
      title,
      difficulty: form.querySelector("#problem-difficulty")?.value || meta.difficulty,
      topic: form.querySelector("#problem-topic")?.value || meta.topic,
      topicTags,
    });
    showPatternSuggestion(host, result);
  } catch (err) {
    const hint = " Select a pattern from the dropdown.";
    setAiStatus(host, "#pattern-ai-status", `${err.message || "Pattern detection failed."}${hint}`, "error");
    focusManualPattern(host);
  } finally {
    btn?.classList.remove("is-loading");
    btn.disabled = false;
  }
}

async function handleAnalyzeComplexity(host) {
  if (host._aiLocked) {
    openUpgradeModal();
    return;
  }

  const btn = host.querySelector("#analyze-complexity-btn");
  const code = host.querySelector("#problem-solution")?.value?.trim();
  const title = host.querySelector("#problem-title")?.value?.trim();

  if (!code || code.length < 8) {
    setAiStatus(host, "#complexity-ai-status", "Paste your solution code first.", "error");
    return;
  }

  btn?.classList.add("is-loading");
  btn.disabled = true;
  setAiStatus(host, "#complexity-ai-status", "Analyzing complexity with AI…", "loading");

  try {
    const result = await analyzeComplexity({ code, title });
    applyComplexityResult(host, result);
    setAiStatus(host, "#complexity-ai-status", "Complexity analyzed — will be saved with this problem.", "success");
  } catch (err) {
    const hint = " Enter time and space complexity below.";
    setAiStatus(host, "#complexity-ai-status", `${err.message || "Analysis failed."}${hint}`, "error");
    focusManualComplexity(host);
  } finally {
    btn?.classList.remove("is-loading");
    updateAnalyzeButtonState(host);
  }
}

function bindLeetcodeHandlers(host) {
  const urlInput = host.querySelector("#leetcode-url");
  const fetchBtn = host.querySelector("#leetcode-fetch-btn");

  fetchBtn?.addEventListener("click", () => handleLeetcodeFetch(host, { force: true }));

  const debouncedFetch = debounce(() => {
    const slug = parseLeetcodeSlug(urlInput?.value);
    if (slug && urlInput?.value.includes("leetcode.com/problems/")) {
      handleLeetcodeFetch(host);
    }
  }, 1500);

  urlInput?.addEventListener("paste", () => setTimeout(debouncedFetch, 200));
  urlInput?.addEventListener("blur", () => {
    const offline = parseLeetcodeUrlOffline(urlInput.value);
    if (offline) {
      const form = host.querySelector("#problem-form");
      form.querySelector('[name="leetcodeSlug"]').value = offline.leetcodeSlug;
    }
  });
}

function bindAiHandlers(host) {
  host.querySelectorAll('[data-action="upgrade-ai"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openUpgradeModal();
    });
  });

  host.querySelector("#detect-pattern-btn")?.addEventListener("click", () => handleDetectPattern(host));

  host.querySelector("#pattern-accept-btn")?.addEventListener("click", () => {
    const suggestion = host.querySelector("#pattern-suggestion");
    const pattern = suggestion?.dataset.pattern;
    const select = host.querySelector("#problem-pattern");
    if (pattern && select) select.value = pattern;
    hidePatternSuggestion(host);
    setAiStatus(host, "#pattern-ai-status", `Pattern set to "${pattern}".`, "success");
  });

  host.querySelector("#pattern-dismiss-btn")?.addEventListener("click", () => hidePatternSuggestion(host));

  host.querySelector("#solution-toggle-btn")?.addEventListener("click", () => {
    const panel = host.querySelector("#solution-panel");
    toggleSolutionPanel(host, panel?.hidden);
  });

  const solutionInput = host.querySelector("#problem-solution");
  solutionInput?.addEventListener("input", debounce(() => updateAnalyzeButtonState(host), 200));

  host.querySelector("#time-complexity")?.addEventListener("input", debounce(() => syncComplexityPreview(host), 200));
  host.querySelector("#space-complexity")?.addEventListener("input", debounce(() => syncComplexityPreview(host), 200));

  host.querySelector("#analyze-complexity-btn")?.addEventListener("click", () => handleAnalyzeComplexity(host));
}

function readForm(form) {
  const fd = new FormData(form);
  const inMission = form.querySelector('[name="inMission"]')?.checked;
  const tagsRaw = fd.get("topicTags") || "";
  const solution = (fd.get("solution") || "").trim();

  return {
    id: fd.get("id"),
    title: fd.get("title"),
    topic: fd.get("topic"),
    pattern: fd.get("pattern"),
    difficulty: fd.get("difficulty"),
    status: fd.get("status"),
    estimatedMinutes: Number(fd.get("estimatedMinutes")) || 30,
    attempts: Number(fd.get("attempts")) || 0,
    leetcodeUrl: fd.get("leetcodeUrl") || null,
    leetcodeSlug: fd.get("leetcodeSlug") || parseLeetcodeSlug(fd.get("leetcodeUrl")),
    leetcodeId: fd.get("leetcodeId") || null,
    topicTags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
    solution,
    timeComplexity: solution ? (fd.get("timeComplexity") || "").trim() : "",
    spaceComplexity: solution ? (fd.get("spaceComplexity") || "").trim() : "",
    inMission,
    missionType: inMission ? (fd.get("missionType") || "new") : null,
  };
}

function ensureModalContainer() {
  let el = document.getElementById(`${MODAL_ID}-host`);
  if (!el) {
    el = document.createElement("div");
    el.id = `${MODAL_ID}-host`;
    document.body.appendChild(el);
  }
  return el;
}

export function openProblemModal(problemId = null) {
  const host = ensureModalContainer();
  const problem = problemId ? getProblem(problemId) : null;
  host._aiLocked = !canAccessProblemAi(getSessionUser());
  host.innerHTML = getModalHTML(problem);
  initModals(host);
  bindLeetcodeHandlers(host);
  bindAiHandlers(host);

  if (problem?.leetcodeUrl || problem?.leetcodeSlug) {
    host._lastLcMeta = {
      title: problem.title,
      topic: problem.topic,
      difficulty: problem.difficulty,
      topicTags: problem.topicTags || [],
      leetcodeUrl: problem.leetcodeUrl,
      leetcodeSlug: problem.leetcodeSlug,
      leetcodeId: problem.leetcodeId,
    };
    showDetectPatternBtn(host, true);
  }

  if (problem?.solution?.trim()) {
    updateAnalyzeButtonState(host);
  }

  const form = host.querySelector("#problem-form");
  const saveBtn = host.querySelector("#problem-save-btn");
  const deleteBtn = host.querySelector("#problem-delete-btn");

  saveBtn?.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const data = readForm(form);

    if (!data.leetcodeSlug && data.leetcodeUrl) {
      data.leetcodeSlug = parseLeetcodeSlug(data.leetcodeUrl);
    }
    if (!data.leetcodeUrl && data.leetcodeSlug) {
      data.leetcodeUrl = buildLeetcodeUrl(data.leetcodeSlug);
    }

    saveBtn.disabled = true;
    try {
      if (data.id) {
        await updateProblem(data.id, data);
      } else {
        await createProblem(data);
      }
      closeModal();
      host.innerHTML = "";
      refreshPage();
    } catch (err) {
      console.error("[problem-modal] save failed", err);
      setStatus(host, err?.message || "Failed to save problem. Try again.", "error");
    } finally {
      saveBtn.disabled = false;
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    const data = readForm(form);
    if (data.id && confirm(`Delete "${data.title}"? This cannot be undone.`)) {
      deleteBtn.disabled = true;
      try {
        await deleteProblem(data.id);
        closeModal();
        host.innerHTML = "";
        refreshPage();
      } catch (err) {
        console.error("[problem-modal] delete failed", err);
        setStatus(host, err?.message || "Failed to delete problem.", "error");
      } finally {
        deleteBtn.disabled = false;
      }
    }
  });

  openModal(MODAL_ID);
}

export function initProblemModalTriggers(root = document) {
  root.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-action='add-problem']");
    if (addBtn) {
      e.preventDefault();
      openProblemModal();
      return;
    }

    const editBtn = e.target.closest("[data-action='edit-problem']");
    if (editBtn) {
      e.preventDefault();
      openProblemModal(editBtn.dataset.id);
      return;
    }
  });
}