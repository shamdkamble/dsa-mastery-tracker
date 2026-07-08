/**
 * Shared problem add/edit/delete modal with LeetCode auto-fill
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
} from "../services/leetcode.js";
import { debounce } from "../utils.js";
import { refreshPage } from "../controllers/page-controller.js";

const MODAL_ID = "problem-modal";

function selectOptions(items, selected) {
  return items.map((item) => {
    const val = typeof item === "string" ? item : item.name;
    const label = typeof item === "string" ? item : item.name;
    return `<option value="${val}"${val === selected ? " selected" : ""}>${label}</option>`;
  }).join("");
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

function renderForm(problem = null) {
  const p = problem || {};
  const lcUrl = p.leetcodeUrl || (p.leetcodeSlug ? buildLeetcodeUrl(p.leetcodeSlug) : "");

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
        ${Field({
          label: "Pattern",
          children: `<select class="select" name="pattern" id="problem-pattern">
            <option value="">Select pattern</option>
            ${selectOptions(PATTERN_CATALOG, p.pattern)}
          </select>`,
        })}
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
    </form>
  `;
}

function getModalHTML(problem = null) {
  const isEdit = Boolean(problem?.id);
  const lcUrl = getProblemLeetcodeUrl(problem);

  return Modal({
    id: MODAL_ID,
    title: isEdit ? "Edit Problem" : "Add New Problem",
    size: "lg",
    body: renderForm(problem),
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
}

async function handleLeetcodeFetch(host) {
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

  fetchBtn?.classList.add("is-loading");
  fetchBtn.disabled = true;
  fetchBtn.querySelector("span").textContent = "Fetching…";
  setStatus(host, "Fetching from LeetCode…", "loading");

  try {
    const meta = await fetchLeetcodeProblem(slug);
    applyMetadata(host, meta);
    setStatus(host, `Loaded "${meta.title}" — fields auto-filled.`, "success");
  } catch (err) {
    const offline = parseLeetcodeUrlOffline(value);
    if (offline) applyMetadata(host, { ...offline, topicTags: [] });
    setStatus(host, err.message || "Could not fetch problem.", "error");
  } finally {
    fetchBtn?.classList.remove("is-loading");
    fetchBtn.disabled = false;
    const label = fetchBtn?.querySelector("span");
    if (label) label.textContent = "Fetch";
  }
}

function bindLeetcodeHandlers(host) {
  const urlInput = host.querySelector("#leetcode-url");
  const fetchBtn = host.querySelector("#leetcode-fetch-btn");

  fetchBtn?.addEventListener("click", () => handleLeetcodeFetch(host));

  const debouncedFetch = debounce(() => {
    const slug = parseLeetcodeSlug(urlInput?.value);
    if (slug && urlInput?.value.includes("leetcode.com")) {
      handleLeetcodeFetch(host);
    }
  }, 800);

  urlInput?.addEventListener("paste", () => setTimeout(debouncedFetch, 100));
  urlInput?.addEventListener("blur", () => {
    const offline = parseLeetcodeUrlOffline(urlInput.value);
    if (offline) {
      const form = host.querySelector("#problem-form");
      form.querySelector('[name="leetcodeSlug"]').value = offline.leetcodeSlug;
    }
  });
}

function readForm(form) {
  const fd = new FormData(form);
  const inMission = form.querySelector('[name="inMission"]')?.checked;
  const tagsRaw = fd.get("topicTags") || "";

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
  host.innerHTML = getModalHTML(problem);
  initModals(host);
  bindLeetcodeHandlers(host);

  const form = host.querySelector("#problem-form");
  const saveBtn = host.querySelector("#problem-save-btn");
  const deleteBtn = host.querySelector("#problem-delete-btn");

  saveBtn?.addEventListener("click", () => {
    if (!form.reportValidity()) return;
    const data = readForm(form);

    if (!data.leetcodeSlug && data.leetcodeUrl) {
      data.leetcodeSlug = parseLeetcodeSlug(data.leetcodeUrl);
    }
    if (!data.leetcodeUrl && data.leetcodeSlug) {
      data.leetcodeUrl = buildLeetcodeUrl(data.leetcodeSlug);
    }

    if (data.id) {
      updateProblem(data.id, data);
    } else {
      createProblem(data);
    }
    closeModal();
    host.innerHTML = "";
    refreshPage();
  });

  deleteBtn?.addEventListener("click", () => {
    const data = readForm(form);
    if (data.id && confirm(`Delete "${data.title}"? This cannot be undone.`)) {
      deleteProblem(data.id);
      closeModal();
      host.innerHTML = "";
      refreshPage();
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