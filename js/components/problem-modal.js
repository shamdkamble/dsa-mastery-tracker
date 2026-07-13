/**
 * Add/edit problem modal — LeetCode import, pattern, AI ideal time
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
import { PATTERN_CATALOG } from "../storage/patterns-catalog.js";
import {
  fetchLeetcodeProblem,
  parseLeetcodeSlug,
  parseLeetcodeUrlOffline,
  buildLeetcodeUrl,
  slugToTitle,
} from "../services/leetcode.js";
import { detectPattern, estimateIdealSolveTime } from "../api/problemAiApi.js";
import { canAccessProblemAi } from "../auth/access.js";
import { getSessionUser } from "../auth/session.js";
import { debounce } from "../utils.js";
import { inferProblemTopic } from "../storage/topic-resolver.js";
import { refreshPage } from "../controllers/page-controller.js";
import { renderLockedAiButton } from "./access-ui.js";
import { openUpgradeModal } from "./upgrade-modal.js";

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
      ` : `
        <div class="problem-hero__empty">
          <span class="problem-hero__empty-icon" aria-hidden="true">${icon("problems")}</span>
          <p class="problem-hero__empty-title">Problem details will appear here</p>
          <p class="problem-hero__empty-text">Add a LeetCode link above.</p>
        </div>
      `}
    </section>
  `;
}

function updateProblemHero(host, meta = {}) {
  const block = host.querySelector("#problem-hero");
  if (!block) return;
  block.outerHTML = renderProblemHero(heroFromProblem(meta));
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

function renderForm(problem = null, { aiLocked = false } = {}) {
  const p = problem || {};
  const lcUrl = p.leetcodeUrl || (p.leetcodeSlug ? buildLeetcodeUrl(p.leetcodeSlug) : "");
  const showDetect = Boolean(p.title && lcUrl);
  const idealMinutes = p.estimatedMinutes || "";

  return `
    <form id="problem-form" class="problem-form">
      ${aiLocked ? `
        <div class="access-inline-notice problem-form__notice" role="note">
          ${icon("lock")}
          <span>AI pattern detection requires <strong>Premium</strong>.</span>
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
            <p class="problem-form__section-desc">Paste a LeetCode problem link.</p>
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
            <h3 class="problem-form__section-title">Classify</h3>
          </div>
        </header>

        <div class="problem-form__grid problem-form__grid--2 problem-form__grid--classify">
          <div class="field problem-form__field">
            <div class="problem-form__field-head">
              <label class="field__label" for="problem-topic">Topic</label>
            </div>
            ${Input({
              placeholder: "—",
              value: escapeAttr(p.topic || ""),
              attrs: 'name="topic" id="problem-topic" readonly aria-readonly="true" tabindex="-1"',
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

        <div class="problem-form__grid problem-form__grid--1">
          ${Field({
            label: "Ideal time",
            children: `
              <input
                type="text"
                class="input"
                name="estimatedMinutes"
                id="problem-ideal-time"
                value="${idealMinutes ? `${idealMinutes} min` : ""}"
                data-minutes="${idealMinutes || ""}"
                placeholder="—"
                readonly
                aria-readonly="true"
                tabindex="-1"
              />
            `,
          })}
        </div>
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

function setIdealTimeUi(host, { minutes, loading = false } = {}) {
  const input = host.querySelector("#problem-ideal-time");
  if (!input) return;

  if (loading) {
    input.value = "…";
    input.dataset.minutes = "";
    return;
  }

  if (minutes != null) {
    input.value = `${minutes} min`;
    input.dataset.minutes = String(minutes);
    return;
  }

  input.value = "";
  input.dataset.minutes = "";
}

function clearImportStatus(host) {
  setStatus(host, "");
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

async function runIdealTimeEstimate(host, meta = {}) {
  const title = meta.title || host.querySelector("#problem-title")?.value?.trim();
  const difficulty = meta.difficulty || host.querySelector("#problem-difficulty")?.value;
  const topic = meta.topic || host.querySelector("#problem-topic")?.value;
  const topicTags = meta.topicTags || [];

  if (!title || !difficulty) {
    setIdealTimeUi(host, { minutes: null });
    return null;
  }

  setIdealTimeUi(host, { loading: true });

  try {
    const result = await estimateIdealSolveTime({ title, difficulty, topic, topicTags });
    setIdealTimeUi(host, { minutes: result.idealMinutes });
    return result.idealMinutes;
  } catch {
    const fallback = difficulty === "Easy" ? 20 : difficulty === "Hard" ? 50 : 35;
    setIdealTimeUi(host, { minutes: fallback });
    return fallback;
  }
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

async function applyMetadata(host, meta) {
  const form = host.querySelector("#problem-form");
  if (!form || !meta) return;

  const setVal = (name, val) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el && val != null && val !== "") el.value = val;
  };

  updateProblemHero(host, meta);
  const topic = meta.topic || inferProblemTopic({
    topic: "",
    topicTags: meta.topicTags || [],
    roadmapTopicId: meta.roadmapTopicId || null,
    pattern: meta.pattern || "",
  });
  if (topic) setVal("topic", topic);
  const patternSelect = form.querySelector("#problem-pattern");
  if (patternSelect && !form.querySelector('[name="id"]')?.value) {
    patternSelect.value = "";
  }
  if (meta.leetcodeUrl) setVal("leetcodeUrl", meta.leetcodeUrl);
  if (meta.leetcodeSlug) setVal("leetcodeSlug", meta.leetcodeSlug);
  if (meta.leetcodeId) setVal("leetcodeId", meta.leetcodeId);
  if (meta.topicTags) setVal("topicTags", meta.topicTags.join(","));

  host._lastLcMeta = { ...meta, topic };
  showDetectPatternBtn(host, true);
  hidePatternSuggestion(host);

  await runIdealTimeEstimate(host, { ...meta, topic });
  void applyPatternPolicyAfterImport(host, { ...meta, topic });
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

function focusManualPattern(host) {
  const select = host.querySelector("#problem-pattern");
  select?.focus();
  select?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
    await applyMetadata(host, host._lastLcMeta);
    clearImportStatus(host);
    return;
  }

  if (host._fetchInProgress) return;
  host._fetchInProgress = true;

  fetchBtn?.classList.add("is-loading");
  fetchBtn.disabled = true;
  fetchBtn.querySelector("span").textContent = "Fetching…";
  clearImportStatus(host);

  try {
    const meta = await fetchLeetcodeProblem(slug);
    host._lastFetchedSlug = slug;
    host._lastLcMeta = meta;
    await applyMetadata(host, meta);

    if (meta.partial) {
      setStatus(host, meta.warning || "Could not load all details. Try Fetch again.", "error");
    } else {
      clearImportStatus(host);
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
    await applyMetadata(host, offline);
    setStatus(host, err?.message || "Could not fetch this problem. Try again.", "error");
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
}

function readForm(form) {
  const fd = new FormData(form);
  const tagsRaw = fd.get("topicTags") || "";
  const idealInput = form.querySelector("#problem-ideal-time");
  const estimatedMinutes = Number(idealInput?.dataset.minutes)
    || Number.parseInt(String(idealInput?.value || "").replace(/\D/g, ""), 10)
    || 30;

  return {
    id: fd.get("id"),
    title: fd.get("title"),
    topic: fd.get("topic"),
    pattern: fd.get("pattern"),
    difficulty: fd.get("difficulty"),
    estimatedMinutes,
    leetcodeUrl: fd.get("leetcodeUrl") || null,
    leetcodeSlug: fd.get("leetcodeSlug") || parseLeetcodeSlug(fd.get("leetcodeUrl")),
    leetcodeId: fd.get("leetcodeId") || null,
    topicTags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
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
    if (problem.estimatedMinutes) {
      setIdealTimeUi(host, { minutes: problem.estimatedMinutes });
    }
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