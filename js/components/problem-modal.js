/**
 * Shared problem add/edit/delete modal with LeetCode auto-fill & AI helpers
 */

import { icon } from "./icons.js";
import { Modal, Button, Field, Input, DifficultyBadge } from "./ui/index.js";
import { openModal, closeModal, initModals } from "./ui/interactions.js";
import {
  createProblem,
  updateProblem,
  deleteProblem,
  getProblem,
} from "../storage/db.js";
import { PATTERN_CATALOG, STATUSES, MISSION_TYPES } from "../storage/patterns-catalog.js";
import {
  fetchLeetcodeProblem,
  parseLeetcodeSlug,
  parseLeetcodeUrlOffline,
  buildLeetcodeUrl,
  slugToTitle,
} from "../services/leetcode.js";
import { detectPattern, analyzeComplexity, validateSolutionCode } from "../api/problemAiApi.js";
import { canAccessProblemAi } from "../auth/access.js";
import { getSessionUser } from "../auth/session.js";
import { debounce } from "../utils.js";
import { refreshPage } from "../controllers/page-controller.js";
import { renderLockedAiButton } from "./access-ui.js";
import { openUpgradeModal } from "./upgrade-modal.js";
import {
  extractSolutionCodeForAnalysis,
  isTrivialFakeCode,
  splitLegacySolutionFields,
} from "../utils/solution-code.js";

const MODAL_ID = "problem-modal";

function formatSelectLabel(value) {
  const str = String(value || "");
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function selectOptions(items, selected) {
  return items.map((item) => {
    const val = typeof item === "string" ? item : (item.value ?? item.name);
    const label = typeof item === "string"
      ? formatSelectLabel(item)
      : (item.label ?? formatSelectLabel(item.name ?? val));
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

function heroFromProblem(p = {}) {
  return {
    title: p.title?.trim() || "",
    difficulty: p.difficulty || "",
    topicTags: Array.isArray(p.topicTags) ? p.topicTags : [],
    leetcodeId: p.leetcodeId || "",
    isPaidOnly: Boolean(p.isPaidOnly),
  };
}

function renderProblemHero(p = {}) {
  const hero = heroFromProblem(p);
  const ready = Boolean(hero.title);

  return `
    <section class="problem-hero${ready ? " problem-hero--ready" : " problem-hero--empty"}" id="problem-hero" aria-live="polite">
      <input type="hidden" name="title" id="problem-title" value="${escapeAttr(hero.title)}">
      <input type="hidden" name="difficulty" id="problem-difficulty" value="${escapeAttr(hero.difficulty)}">
      ${ready ? `
        <div class="problem-hero__bar">
          <div class="problem-hero__meta-chips">
            <span class="problem-hero__source">LeetCode</span>
            ${hero.leetcodeId ? `<span class="problem-hero__id">#${escapeHtml(hero.leetcodeId)}</span>` : ""}
            ${hero.isPaidOnly ? `<span class="problem-hero__premium">Premium</span>` : ""}
          </div>
          <div class="problem-hero__difficulty" id="problem-difficulty-display">${DifficultyBadge(hero.difficulty || "Medium")}</div>
        </div>
        <h3 class="problem-hero__title" id="problem-title-display">${escapeHtml(hero.title)}</h3>
        ${hero.topicTags.length ? `
          <div class="problem-hero__tags" id="problem-hero-tags">
            ${hero.topicTags.map((t) => `<span class="badge badge--accent badge--sm">${escapeHtml(t)}</span>`).join("")}
          </div>
        ` : `<div class="problem-hero__tags" id="problem-hero-tags" hidden></div>`}
        <p class="problem-hero__synced">Synced from LeetCode — title and difficulty are read-only.</p>
      ` : `
        <div class="problem-hero__empty">
          <span class="problem-hero__empty-icon" aria-hidden="true">${icon("problems")}</span>
          <p class="problem-hero__empty-title">Problem details will appear here</p>
          <p class="problem-hero__empty-text">Fetch a LeetCode URL above to load the title, difficulty, and tags.</p>
        </div>
      `}
    </section>
  `;
}

function updateProblemHero(host, meta = {}) {
  const block = host.querySelector("#problem-hero");
  if (!block) return;

  const hero = heroFromProblem(meta);
  block.outerHTML = renderProblemHero(hero);
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

function renderSolutionSection(p = {}, { aiLocked = false } = {}) {
  const hasContent = Boolean(p.approach?.trim() || p.solution?.trim());
  const isOpen = hasContent;

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
        <span>${isOpen ? "Approach & Solution" : "Add Approach & Solution"}</span>
        <span class="problem-optional-section__toggle-chevron" aria-hidden="true">${icon("chevronDown")}</span>
      </button>
      <div class="problem-optional-section__panel" id="solution-panel" ${isOpen ? "" : "hidden"}>
        ${Field({
          label: "My approach",
          hint: "Optional — write your plan, pseudocode, or logic before or while solving. Not used for complexity analysis.",
          children: `<textarea
            class="textarea problem-approach-input"
            name="approach"
            id="problem-approach"
            rows="4"
            placeholder="e.g. Use a hash map to store complements while scanning the array once…"
          >${escapeHtml(p.approach || "")}</textarea>`,
        })}
        ${Field({
          label: "Solution code",
          hint: "Optional — paste your final accepted code (any language). Analyze Complexity uses this field only.",
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
            <span class="problem-complexity__hint" id="complexity-hint">${aiLocked ? "Upgrade to Premium to unlock AI complexity analysis" : "Paste solution code — Groq verifies it before analysis"}</span>
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
    <form id="problem-form" class="problem-form">
      ${aiLocked ? `
        <div class="access-inline-notice problem-form__notice" role="note">
          ${icon("lock")}
          <span>AI pattern detection &amp; complexity analysis require <strong>Premium</strong>.</span>
          <button type="button" class="access-inline-notice__link" data-action="upgrade-ai">Upgrade</button>
        </div>
      ` : ""}
      <input type="hidden" name="id" value="${p.id || ""}">
      <input type="hidden" name="leetcodeSlug" value="${p.leetcodeSlug || ""}">
      <input type="hidden" name="leetcodeId" value="${p.leetcodeId || ""}">
      <input type="hidden" name="topicTags" value="${(p.topicTags || []).join(",")}">

      <section class="problem-form__section">
        <header class="problem-form__section-head">
          <span class="problem-form__step" aria-hidden="true">1</span>
          <div class="problem-form__section-copy">
            <h3 class="problem-form__section-title">Import from LeetCode</h3>
            <p class="problem-form__section-desc">Paste a problem URL — we load the official title, difficulty, and tags.</p>
          </div>
        </header>
        <div class="problem-form__import">
          <label class="field__label" for="leetcode-url">Problem URL</label>
          <div class="problem-form__import-row">
            <div class="problem-form__import-input">
              <span class="problem-form__import-icon" aria-hidden="true">${icon("link")}</span>
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
            <button class="btn btn--secondary problem-form__fetch-btn" type="button" id="leetcode-fetch-btn">
              ${icon("search")}
              <span>Fetch</span>
            </button>
          </div>
          <p class="leetcode-import__status" id="leetcode-status" aria-live="polite"></p>
        </div>
      </section>

      ${renderProblemHero(p)}

      <section class="problem-form__section">
        <header class="problem-form__section-head">
          <span class="problem-form__step" aria-hidden="true">2</span>
          <div class="problem-form__section-copy">
            <h3 class="problem-form__section-title">Classify &amp; track</h3>
            <p class="problem-form__section-desc">Add your pattern, status, and study metadata.</p>
          </div>
        </header>

        <div class="problem-form__grid problem-form__grid--2 problem-form__grid--classify">
          <div class="field problem-form__field">
            <div class="problem-form__field-head">
              <label class="field__label" for="problem-topic">Topic</label>
              <span class="problem-form__field-meta">From LeetCode tags</span>
            </div>
            ${Input({
              placeholder: "e.g. Array · Hash Table",
              value: p.topic || "",
              attrs: 'name="topic" id="problem-topic"',
            })}
          </div>
          <div class="field problem-form__field">
            <div class="problem-form__field-head">
              <label class="field__label" for="problem-pattern">Pattern</label>
              ${aiLocked
                ? `<span class="problem-form__field-action" id="detect-pattern-btn-wrap" ${showDetect ? "" : "hidden"}>${renderLockedAiButton({ id: "detect-pattern-btn", label: "Auto Detect", size: "xs" })}</span>`
                : `<span class="problem-form__field-action" id="detect-pattern-btn-wrap" ${showDetect ? "" : "hidden"}>
                    <button
                      class="btn btn--ghost btn--xs"
                      type="button"
                      id="detect-pattern-btn"
                    >
                      ${icon("zap")}
                      <span>Auto Detect</span>
                    </button>
                  </span>`}
            </div>
            <select class="select" name="pattern" id="problem-pattern">
              <option value="">Select pattern</option>
              ${selectOptions(PATTERN_CATALOG, p.pattern)}
            </select>
            ${renderPatternSuggestion()}
          </div>
        </div>

        <div class="problem-form__grid problem-form__grid--3">
          ${Field({
            label: "Status",
            children: `<select class="select" name="status">${selectOptions(STATUSES, p.status || "todo")}</select>`,
          })}
          ${Field({
            label: "Est. time",
            hint: "Minutes",
            children: Input({
              type: "number",
              value: p.estimatedMinutes || 30,
              attrs: 'name="estimatedMinutes" id="problem-time" min="5" max="180"',
            }),
          })}
          ${Field({
            label: "Attempts",
            children: Input({ type: "number", value: p.attempts || 0, attrs: 'name="attempts" min="0"' }),
          })}
        </div>

        <div class="problem-form__mission">
          <label class="problem-form__mission-check checkbox">
            <input type="checkbox" name="inMission" ${p.inMission ? "checked" : ""}>
            <span>Include in today's mission</span>
          </label>
          <div class="problem-form__mission-type field">
            <label class="field__label" for="problem-mission-type">Mission type</label>
            <select class="select" name="missionType" id="problem-mission-type">
              <option value="">None</option>
              ${selectOptions(MISSION_TYPES, p.missionType || "new")}
            </select>
          </div>
        </div>
      </section>

      <section class="problem-form__section problem-form__section--solution">
        ${renderSolutionSection(p, { aiLocked })}
      </section>
    </form>
  `;
}

function getModalHTML(problem = null) {
  const isEdit = Boolean(problem?.id);
  const lcUrl = getProblemLeetcodeUrl(problem);
  const aiLocked = !canAccessProblemAi(getSessionUser());

  return Modal({
    id: MODAL_ID,
    title: isEdit ? "Edit Problem" : "Add Problem",
    size: "lg",
    className: "modal--problem",
    body: renderForm(problem, { aiLocked }),
    footer: `
      <div class="problem-form__footer">
        <div class="problem-form__footer-start">
          ${isEdit ? Button({ label: "Delete", variant: "danger", attrs: 'id="problem-delete-btn" type="button"' }) : ""}
          ${isEdit && lcUrl ? `<a href="${lcUrl}" class="btn btn--outline btn--sm" target="_blank" rel="noopener noreferrer">${icon("externalLink")}<span>Open on LeetCode</span></a>` : ""}
        </div>
        <div class="problem-form__footer-end">
          ${Button({ label: "Cancel", variant: "ghost", attrs: "data-modal-close type='button'" })}
          ${Button({ label: isEdit ? "Save Changes" : "Add Problem", variant: "primary", attrs: 'id="problem-save-btn" type="button"' })}
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

function isEasyDifficulty(difficulty) {
  return String(difficulty || "").trim().toLowerCase() === "easy";
}

function applyPatternToSelect(host, pattern) {
  const select = host.querySelector("#problem-pattern");
  if (!select || !pattern) return false;

  const option = [...select.options].find((opt) => opt.value === pattern);
  if (option) {
    select.value = pattern;
    return true;
  }
  return false;
}

function getPatternDetectContext(host) {
  const form = host.querySelector("#problem-form");
  const meta = host._lastLcMeta || {};
  const title = form?.querySelector("#problem-title")?.value?.trim();
  const topicTagsRaw = form?.querySelector('[name="topicTags"]')?.value || "";
  const topicTags = topicTagsRaw
    ? topicTagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : (meta.topicTags || []);

  return {
    title,
    difficulty: form?.querySelector("#problem-difficulty")?.value || meta.difficulty,
    topic: form?.querySelector("#problem-topic")?.value || meta.topic,
    topicTags,
  };
}

async function runPatternDetection(host, { autoApply = false } = {}) {
  if (host._aiLocked) {
    if (!autoApply) openUpgradeModal("ai-features");
    return null;
  }

  const btn = host.querySelector("#detect-pattern-btn");
  const { title, difficulty, topic, topicTags } = getPatternDetectContext(host);

  if (!title) {
    if (!autoApply) {
      setAiStatus(host, "#pattern-ai-status", "Enter or fetch a problem title first.", "error");
    }
    return null;
  }

  if (!autoApply) {
    btn?.classList.add("is-loading");
    if (btn) btn.disabled = true;
  }

  hidePatternSuggestion(host);
  setAiStatus(
    host,
    "#pattern-ai-status",
    autoApply ? "Easy problem — auto-detecting pattern…" : "Detecting pattern with AI…",
    "loading",
  );

  try {
    const result = await detectPattern({ title, difficulty, topic, topicTags });

    if (autoApply) {
      const applied = applyPatternToSelect(host, result.primary);
      if (applied) {
        setAiStatus(host, "#pattern-ai-status", `Pattern auto-selected: ${result.primary}`, "success");
      } else {
        setAiStatus(host, "#pattern-ai-status", "Could not match pattern — use Auto Detect or pick manually.", "error");
        focusManualPattern(host);
      }
      return result;
    }

    showPatternSuggestion(host, result);
    return result;
  } catch (err) {
    const hint = autoApply
      ? " Tap Auto Detect to try again or pick a pattern manually."
      : " Select a pattern from the dropdown.";
    setAiStatus(host, "#pattern-ai-status", `${err.message || "Pattern detection failed."}${hint}`, "error");
    if (!autoApply) focusManualPattern(host);
    return null;
  } finally {
    if (!autoApply) {
      btn?.classList.remove("is-loading");
      if (btn) btn.disabled = false;
    }
  }
}

async function applyPatternPolicyAfterImport(host, meta) {
  const difficulty = meta?.difficulty
    || host.querySelector("#problem-difficulty")?.value
    || "";

  if (isEasyDifficulty(difficulty)) {
    if (host._aiLocked) {
      setAiStatus(host, "#pattern-ai-status", "Easy problem — upgrade to Premium for automatic pattern detection.", "info");
      return;
    }
    await runPatternDetection(host, { autoApply: true });
    return;
  }

  setAiStatus(
    host,
    "#pattern-ai-status",
    "Medium/Hard — tap Auto Detect when you're ready to choose a pattern.",
    "info",
  );
}

function applyMetadata(host, meta) {
  const form = host.querySelector("#problem-form");
  if (!form || !meta) return;

  const setVal = (name, val) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el && val != null && val !== "") el.value = val;
  };

  updateProblemHero(host, meta);
  if (meta.topic) setVal("topic", meta.topic);
  const patternSelect = form.querySelector("#problem-pattern");
  if (patternSelect) patternSelect.value = "";
  if (meta.estimatedMinutes) setVal("estimatedMinutes", meta.estimatedMinutes);
  if (meta.leetcodeUrl) setVal("leetcodeUrl", meta.leetcodeUrl);
  if (meta.leetcodeSlug) setVal("leetcodeSlug", meta.leetcodeSlug);
  if (meta.leetcodeId) setVal("leetcodeId", meta.leetcodeId);
  if (meta.topicTags) setVal("topicTags", meta.topicTags.join(","));

  host._lastLcMeta = meta;
  showDetectPatternBtn(host, true);
  hidePatternSuggestion(host);

  void applyPatternPolicyAfterImport(host, meta);
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

  if (label) label.textContent = open ? "Approach & Solution" : "Add Approach & Solution";

  if (open) {
    scheduleSolutionCodeValidation(host);
    host.querySelector("#problem-approach")?.focus();
  }
}

const CODE_VALIDATE_DEBOUNCE_MS = 700;

function setAnalyzeComplexityUi(host, { disabled, hint }) {
  const btn = host.querySelector("#analyze-complexity-btn");
  const hintEl = host.querySelector("#complexity-hint");
  if (btn) btn.disabled = disabled;
  if (hintEl && hint) hintEl.textContent = hint;
}

function getExtractedSolutionCode(raw) {
  const extracted = extractSolutionCodeForAnalysis(raw);
  return {
    extracted,
    code: extracted.code?.trim() || "",
  };
}

function scheduleSolutionCodeValidation(host) {
  if (host._aiLocked) return;

  clearTimeout(host._codeValidateTimer);
  host._codeValidateTimer = setTimeout(() => {
    void runSolutionCodeValidation(host);
  }, CODE_VALIDATE_DEBOUNCE_MS);
}

async function runSolutionCodeValidation(host) {
  if (host._aiLocked) return;

  const raw = host.querySelector("#problem-solution")?.value?.trim() || "";
  const btn = host.querySelector("#analyze-complexity-btn");

  host._codeValidateAbort?.abort();
  host._codeValidateAbort = new AbortController();
  const requestId = ++host._codeValidateSeq;

  if (!raw) {
    host._codeValid = false;
    host._lastValidatedCode = "";
    setAnalyzeComplexityUi(host, {
      disabled: true,
      hint: "Paste solution code above — approach notes stay separate",
    });
    return;
  }

  const { extracted, code } = getExtractedSolutionCode(raw);

  if (!code) {
    host._codeValid = false;
    host._lastValidatedCode = "";
    setAnalyzeComplexityUi(host, {
      disabled: true,
      hint: extracted.reason === "prose"
        ? "Approach-style text belongs in My approach — paste code here"
        : "Paste your accepted solution code first",
    });
    return;
  }

  if (isTrivialFakeCode(code)) {
    host._codeValid = false;
    host._lastValidatedCode = code;
    setAnalyzeComplexityUi(host, {
      disabled: true,
      hint: "Add real solution code — braces or punctuation alone are not valid",
    });
    return;
  }

  if (host._lastValidatedCode === code && host._codeValid === true) {
    setAnalyzeComplexityUi(host, {
      disabled: false,
      hint: host._codeValidHint || "Valid solution code — ready to analyze",
    });
    return;
  }

  if (host._lastValidatedCode === code && host._codeValid === false) {
    setAnalyzeComplexityUi(host, {
      disabled: true,
      hint: host._codeInvalidHint || "This doesn't look like real solution code",
    });
    return;
  }

  if (btn) btn.disabled = true;
  setAnalyzeComplexityUi(host, { disabled: true, hint: "Checking code with AI…" });

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
      host._codeValidHint = `Valid ${lang}code — ready to analyze`;
      setAnalyzeComplexityUi(host, { disabled: false, hint: host._codeValidHint });
      return;
    }

    host._codeInvalidHint = result.reason || "This doesn't look like real solution code";
    setAnalyzeComplexityUi(host, { disabled: true, hint: host._codeInvalidHint });
  } catch (err) {
    if (host._codeValidateAbort?.signal.aborted || requestId !== host._codeValidateSeq) return;

    host._codeValid = false;
    host._lastValidatedCode = code;
    host._codeInvalidHint = err?.message || "Could not verify code — try again";
    setAnalyzeComplexityUi(host, { disabled: true, hint: host._codeInvalidHint });
  } finally {
    if (requestId === host._codeValidateSeq && btn?.classList.contains("is-loading")) {
      btn.disabled = !host._codeValid;
    }
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
  await runPatternDetection(host, { autoApply: false });
}

async function handleAnalyzeComplexity(host) {
  if (host._aiLocked) {
    openUpgradeModal("ai-features");
    return;
  }

  const btn = host.querySelector("#analyze-complexity-btn");
  const raw = host.querySelector("#problem-solution")?.value?.trim() || "";
  const title = host.querySelector("#problem-title")?.value?.trim();
  const { extracted, code } = getExtractedSolutionCode(raw);

  if (!code || isTrivialFakeCode(code)) {
    setAiStatus(
      host,
      "#complexity-ai-status",
      extracted.reason === "prose"
        ? "Approach-style text belongs in My approach — paste solution code here for analysis."
        : "Paste valid solution code first.",
      "error",
    );
    return;
  }

  if (!host._codeValid || host._lastValidatedCode !== code) {
    setAiStatus(host, "#complexity-ai-status", "Waiting for code validation…", "loading");
    await runSolutionCodeValidation(host);
    if (!host._codeValid || host._lastValidatedCode !== code) {
      setAiStatus(
        host,
        "#complexity-ai-status",
        host._codeInvalidHint || "Paste valid solution code before analyzing complexity.",
        "error",
      );
      return;
    }
  }

  btn?.classList.add("is-loading");
  btn.disabled = true;
  setAiStatus(host, "#complexity-ai-status", "Analyzing complexity with AI…", "loading");

  try {
    const result = await analyzeComplexity({ code, title });
    applyComplexityResult(host, result);
    setAiStatus(
      host,
      "#complexity-ai-status",
      extracted.stripped
        ? "Complexity analyzed from code only — extra notes were ignored."
        : "Complexity analyzed — will be saved with this problem.",
      "success",
    );
  } catch (err) {
    const hint = " Enter time and space complexity below.";
    setAiStatus(host, "#complexity-ai-status", `${err.message || "Analysis failed."}${hint}`, "error");
    focusManualComplexity(host);
  } finally {
    btn?.classList.remove("is-loading");
    scheduleSolutionCodeValidation(host);
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
      openUpgradeModal("ai-features");
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
  solutionInput?.addEventListener("input", () => scheduleSolutionCodeValidation(host));

  host.querySelector("#time-complexity")?.addEventListener("input", debounce(() => syncComplexityPreview(host), 200));
  host.querySelector("#space-complexity")?.addEventListener("input", debounce(() => syncComplexityPreview(host), 200));

  host.querySelector("#analyze-complexity-btn")?.addEventListener("click", () => handleAnalyzeComplexity(host));
}

function readForm(form) {
  const fd = new FormData(form);
  const inMission = form.querySelector('[name="inMission"]')?.checked;
  const tagsRaw = fd.get("topicTags") || "";
  const approach = (fd.get("approach") || "").trim();
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
    approach,
    solution,
    timeComplexity: (fd.get("timeComplexity") || "").trim(),
    spaceComplexity: (fd.get("spaceComplexity") || "").trim(),
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
  const rawProblem = problemId ? getProblem(problemId) : null;
  const problem = rawProblem ? { ...rawProblem, ...splitLegacySolutionFields(rawProblem) } : null;
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

  host._codeValidateSeq = 0;
  host._codeValid = false;
  host._lastValidatedCode = "";

  if (problem?.solution?.trim()) {
    scheduleSolutionCodeValidation(host);
  }

  const form = host.querySelector("#problem-form");
  const saveBtn = host.querySelector("#problem-save-btn");
  const deleteBtn = host.querySelector("#problem-delete-btn");

  saveBtn?.addEventListener("click", async () => {
    const data = readForm(form);

    if (!data.title?.trim()) {
      setStatus(host, "Fetch a LeetCode problem first to load the title and difficulty.", "error");
      return;
    }
    if (!data.difficulty?.trim()) {
      setStatus(host, "Difficulty is missing — refetch the LeetCode link.", "error");
      return;
    }

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