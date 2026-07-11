import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Button, EmptyState, SkeletonTable, Toast, showToast } from "../components/ui/index.js";
import {
  testingSubnav,
  testingHero,
  issueStatusBadge,
  issueSeverityBadge,
} from "../components/testing-shell.js";
import { getSessionUser, isAdmin } from "../auth/session.js";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "fixed", label: "Awaiting Verify" },
  { id: "resolved", label: "Resolved" },
];

const SEVERITIES = ["low", "medium", "high", "critical"];

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderFilterChips(active) {
  return STATUS_FILTERS.map((f) => `
    <button
      type="button"
      class="testing-chip${active === f.id ? " is-selected" : ""}"
      data-filter="${f.id}"
    >${f.label}</button>
  `).join("");
}

function renderActions(issue, user) {
  const admin = isAdmin();
  const isOwner = issue.reporterId === user?.id;
  const actions = [];

  if (admin) {
    if (issue.status === "pending") {
      actions.push(`<button type="button" class="btn btn--xs btn--secondary" data-action="issue-start" data-id="${issue.id}">Start Work</button>`);
    }
    if (issue.status === "pending" || issue.status === "in_progress") {
      actions.push(`<button type="button" class="btn btn--xs btn--primary" data-action="issue-fixed" data-id="${issue.id}">Mark Fixed</button>`);
    }
    actions.push(`<button type="button" class="btn btn--xs btn--ghost" data-action="issue-note" data-id="${issue.id}">Admin Note</button>`);
  }

  if (!admin || isOwner) {
    if (issue.status === "fixed") {
      actions.push(`<button type="button" class="btn btn--xs btn--primary" data-action="issue-confirm" data-id="${issue.id}">Confirm Resolved</button>`);
      actions.push(`<button type="button" class="btn btn--xs btn--ghost" data-action="issue-reopen" data-id="${issue.id}">Reopen</button>`);
    }
  }

  actions.push(`<button type="button" class="btn btn--xs btn--ghost" data-action="issue-view" data-id="${issue.id}" title="View details">${icon("notes")}</button>`);

  return actions.length
    ? `<div class="testing-actions">${actions.join("")}</div>`
    : `<div class="testing-actions"><button type="button" class="btn btn--xs btn--ghost" data-action="issue-view" data-id="${issue.id}">${icon("notes")}</button></div>`;
}

function renderIssueRow(issue, user) {
  return `
    <tr class="testing-row" data-issue-id="${issue.id}" data-status="${issue.status}" data-severity="${issue.severity}">
      <td data-label="#"><span class="testing-id">#${issue.issueNumber}</span></td>
      <td data-label="Title">
        <div class="testing-title-cell">
          <span class="table__cell-primary">${escapeHtml(issue.title)}</span>
          ${issue.description ? `<span class="testing-title-cell__preview">${escapeHtml(issue.description.slice(0, 80))}${issue.description.length > 80 ? "…" : ""}</span>` : ""}
        </div>
      </td>
      <td data-label="Page"><span class="table__cell-secondary">${escapeHtml(issue.pageArea || "—")}</span></td>
      <td data-label="Severity">${issueSeverityBadge(issue.severity)}</td>
      <td data-label="Status">${issueStatusBadge(issue.status)}</td>
      <td data-label="Reporter"><span class="text-secondary text-xs">${escapeHtml(issue.reporterName || "—")}</span></td>
      <td data-label="Created"><span class="text-tertiary text-xs font-mono">${formatDate(issue.createdAt)}</span></td>
      <td data-label="Updated"><span class="text-tertiary text-xs font-mono">${formatDate(issue.updatedAt)}</span></td>
      <td data-label="Actions">${renderActions(issue, user)}</td>
    </tr>
  `;
}

function renderIssueModal() {
  return `
    <div class="testing-modal" id="testing-issue-modal" hidden>
      <div class="testing-modal__backdrop" data-action="close-issue-modal"></div>
      <div class="testing-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="testing-modal-title">
        <div class="testing-modal__header">
          <h2 class="testing-modal__title" id="testing-modal-title">Report Issue</h2>
          <button type="button" class="btn btn--ghost btn--sm" data-action="close-issue-modal" aria-label="Close">${icon("close")}</button>
        </div>
        <form id="testing-issue-form" class="testing-modal__body">
          <input type="hidden" name="mode" value="create" />
          <input type="hidden" name="issueId" value="" />
          <div class="testing-form-grid">
            <label class="field">
              <span class="field__label">Title <span class="text-danger">*</span></span>
              <input class="input" name="title" required placeholder="Short summary of the bug" />
            </label>
            <label class="field">
              <span class="field__label">Page / Area</span>
              <input class="input" name="pageArea" placeholder="e.g. Problems, Mission, Calendar" />
            </label>
            <label class="field">
              <span class="field__label">Severity</span>
              <select class="input" name="severity">
                ${SEVERITIES.map((s) => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
              </select>
            </label>
          </div>
          <label class="field">
            <span class="field__label">Description</span>
            <textarea class="input testing-textarea" name="description" rows="3" placeholder="What happened?"></textarea>
          </label>
          <label class="field">
            <span class="field__label">Steps to Reproduce</span>
            <textarea class="input testing-textarea" name="stepsToReproduce" rows="3" placeholder="1. Go to…&#10;2. Click…&#10;3. See error"></textarea>
          </label>
          <div class="testing-form-grid">
            <label class="field">
              <span class="field__label">Expected Behavior</span>
              <textarea class="input testing-textarea" name="expectedBehavior" rows="2"></textarea>
            </label>
            <label class="field">
              <span class="field__label">Actual Behavior</span>
              <textarea class="input testing-textarea" name="actualBehavior" rows="2"></textarea>
            </label>
          </div>
          <div id="testing-modal-details" class="testing-modal-details" hidden></div>
          <label class="field" id="testing-admin-note-field" hidden>
            <span class="field__label">Admin Notes</span>
            <textarea class="input testing-textarea" name="adminNotes" rows="2"></textarea>
          </label>
        </form>
        <div class="testing-modal__footer">
          <button type="button" class="btn btn--ghost" data-action="close-issue-modal">Cancel</button>
          <button type="submit" form="testing-issue-form" class="btn btn--primary" id="testing-issue-submit">Submit Issue</button>
        </div>
      </div>
    </div>
  `;
}

function renderPage({ issues, loading, error, filter = "all" }) {
  const user = getSessionUser();
  const filtered = filter === "all"
    ? issues
    : issues.filter((i) => i.status === filter);

  const tableBody = loading
    ? ""
    : filtered.length
      ? filtered.map((i) => renderIssueRow(i, user)).join("")
      : "";

  return createPage({
    hideHeader: true,
    children: `
      <div class="testing-page testing-page--modern" data-testing-issues>
        ${testingHero({
          title: "Issue Tracker",
          description: "Log defects with full context. Admins fix and mark ready — you confirm when it's truly resolved.",
          badge: isAdmin() ? "QA Admin" : "QA Tester",
        })}
        ${testingSubnav("issues")}

        <div class="testing-toolbar">
          <div class="testing-filters">${renderFilterChips(filter)}</div>
          <button type="button" class="btn btn--primary btn--sm" data-action="open-issue-modal">
            ${icon("plus")}<span>Report Issue</span>
          </button>
        </div>

        ${error ? `<div class="testing-alert testing-alert--danger">${escapeHtml(error)}</div>` : ""}

        <div class="testing-table-card">
          ${loading ? SkeletonTable({ rows: 8 }) : filtered.length ? `
            <div class="table-wrapper">
              <table class="table table--interactive testing-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Page</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reporter</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>${tableBody}</tbody>
              </table>
            </div>
          ` : EmptyState({
            title: "No issues match this filter",
            text: "Try another filter or report a new issue.",
            iconName: "search",
            actions: Button({ label: "Report Issue", variant: "primary", attrs: 'data-action="open-issue-modal" type="button"' }),
          })}
        </div>

        ${renderIssueModal()}
      </div>
    `,
  });
}

let issuesCache = [];
let activeFilter = "all";

async function reloadIssues(container) {
  const { fetchTestIssues } = await import("../api/testIssuesApi.js");
  const { issues } = await fetchTestIssues();
  issuesCache = issues || [];
  const host = container.querySelector(".content-inner") || container;
  host.innerHTML = renderPage({ issues: issuesCache, loading: false, error: null, filter: activeFilter });
  bindIssuesPage(container);
}

function openModal(mode = "create", issue = null) {
  const modal = document.getElementById("testing-issue-modal");
  const form = document.getElementById("testing-issue-form");
  const title = document.getElementById("testing-modal-title");
  const submit = document.getElementById("testing-issue-submit");
  const details = document.getElementById("testing-modal-details");
  const adminNoteField = document.getElementById("testing-admin-note-field");

  if (!modal || !form) return;

  form.reset();
  form.mode.value = mode;
  form.issueId.value = issue?.id || "";

  const readOnly = mode === "view";
  [...form.elements].forEach((el) => {
    if (el.name && el.name !== "mode" && el.name !== "issueId") {
      el.disabled = readOnly && el.name !== "adminNotes";
    }
  });

  if (issue) {
    form.title.value = issue.title || "";
    form.pageArea.value = issue.pageArea || "";
    form.severity.value = issue.severity || "medium";
    form.description.value = issue.description || "";
    form.stepsToReproduce.value = issue.stepsToReproduce || "";
    form.expectedBehavior.value = issue.expectedBehavior || "";
    form.actualBehavior.value = issue.actualBehavior || "";
    if (form.adminNotes) form.adminNotes.value = issue.adminNotes || "";
  }

  if (mode === "view" && issue) {
    title.textContent = `Issue #${issue.issueNumber}`;
    submit.hidden = true;
    adminNoteField.hidden = !isAdmin();
    if (isAdmin()) form.adminNotes.disabled = false;

    details.hidden = false;
    details.innerHTML = `
      <div class="testing-detail-grid">
        <div><span class="testing-detail-label">Status</span>${issueStatusBadge(issue.status)}</div>
        <div><span class="testing-detail-label">Reporter</span>${escapeHtml(issue.reporterName)}</div>
        <div><span class="testing-detail-label">Fixed by</span>${escapeHtml(issue.fixedByName || "—")}</div>
        <div><span class="testing-detail-label">Fixed at</span>${formatDate(issue.fixedAt)}</div>
        <div><span class="testing-detail-label">Resolved at</span>${formatDate(issue.resolvedAt)}</div>
      </div>
      ${issue.adminNotes ? `<div class="testing-detail-notes"><span class="testing-detail-label">Admin Notes</span><p>${escapeHtml(issue.adminNotes)}</p></div>` : ""}
    `;
  } else if (mode === "note" && issue) {
    title.textContent = `Admin Note — #${issue.issueNumber}`;
    submit.hidden = false;
    submit.textContent = "Save Note";
    adminNoteField.hidden = false;
    details.hidden = true;
    [...form.elements].forEach((el) => {
      if (el.name && !["adminNotes", "mode", "issueId"].includes(el.name)) el.disabled = true;
    });
    form.adminNotes.disabled = false;
  } else {
    title.textContent = "Report Issue";
    submit.hidden = false;
    submit.textContent = "Submit Issue";
    adminNoteField.hidden = true;
    details.hidden = true;
    [...form.elements].forEach((el) => {
      if (el.name && el.name !== "mode" && el.name !== "issueId") el.disabled = false;
    });
  }

  modal.hidden = false;
  document.body.classList.add("testing-modal-open");
}

function closeModal() {
  const modal = document.getElementById("testing-issue-modal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("testing-modal-open");
}

function findIssue(id) {
  return issuesCache.find((i) => i.id === id) || null;
}

function bindIssuesPage(container) {
  if (container.dataset.testingIssuesBound) return;
  container.dataset.testingIssuesBound = "true";

  container.addEventListener("click", async (e) => {
    const filterChip = e.target.closest("[data-filter]");
    if (filterChip) {
      activeFilter = filterChip.dataset.filter;
      const host = container.querySelector(".content-inner") || container;
      host.innerHTML = renderPage({ issues: issuesCache, loading: false, error: null, filter: activeFilter });
      bindIssuesPage(container);
      return;
    }

    const openBtn = e.target.closest("[data-action='open-issue-modal']");
    if (openBtn) {
      openModal("create");
      return;
    }

    const closeBtn = e.target.closest("[data-action='close-issue-modal']");
    if (closeBtn) {
      closeModal();
      return;
    }

    const viewBtn = e.target.closest("[data-action='issue-view']");
    if (viewBtn) {
      openModal("view", findIssue(viewBtn.dataset.id));
      return;
    }

    const noteBtn = e.target.closest("[data-action='issue-note']");
    if (noteBtn) {
      openModal("note", findIssue(noteBtn.dataset.id));
      return;
    }

    const actionBtn = e.target.closest("[data-action^='issue-']");
    if (!actionBtn) return;

    const id = actionBtn.dataset.id;
    const { apiUpdateTestIssue } = await import("../api/testIssuesApi.js");

    try {
      if (actionBtn.dataset.action === "issue-start") {
        await apiUpdateTestIssue(id, { status: "in_progress" });
        showToast(Toast({ title: "Issue in progress", variant: "info" }));
      } else if (actionBtn.dataset.action === "issue-fixed") {
        await apiUpdateTestIssue(id, { status: "fixed" });
        showToast(Toast({ title: "Marked fixed", text: "Tester will be notified to verify.", variant: "success" }));
      } else if (actionBtn.dataset.action === "issue-confirm") {
        await apiUpdateTestIssue(id, { action: "confirm_resolved" });
        showToast(Toast({ title: "Issue resolved", text: "Thanks for confirming the fix.", variant: "success" }));
      } else if (actionBtn.dataset.action === "issue-reopen") {
        if (!confirm("Reopen this issue? The admin will need to fix it again.")) return;
        await apiUpdateTestIssue(id, { action: "reopen" });
        showToast(Toast({ title: "Issue reopened", variant: "warning" }));
      }
      closeModal();
      await reloadIssues(container);
    } catch (err) {
      showToast(Toast({ title: "Update failed", text: err?.message, variant: "danger" }));
    }
  });

  container.addEventListener("submit", async (e) => {
    if (e.target.id !== "testing-issue-form") return;
    e.preventDefault();

    const fd = new FormData(e.target);
    const mode = fd.get("mode");
    const issueId = fd.get("issueId");

    const payload = {
      title: String(fd.get("title") || "").trim(),
      pageArea: String(fd.get("pageArea") || "").trim(),
      severity: fd.get("severity") || "medium",
      description: String(fd.get("description") || "").trim(),
      stepsToReproduce: String(fd.get("stepsToReproduce") || "").trim(),
      expectedBehavior: String(fd.get("expectedBehavior") || "").trim(),
      actualBehavior: String(fd.get("actualBehavior") || "").trim(),
    };

    try {
      const { apiCreateTestIssue, apiUpdateTestIssue } = await import("../api/testIssuesApi.js");

      if (mode === "create") {
        await apiCreateTestIssue(payload);
        showToast(Toast({ title: "Issue reported", variant: "success" }));
      } else if (mode === "note") {
        await apiUpdateTestIssue(issueId, { adminNotes: String(fd.get("adminNotes") || "").trim() });
        showToast(Toast({ title: "Admin note saved", variant: "success" }));
      }

      closeModal();
      await reloadIssues(container);
    } catch (err) {
      showToast(Toast({ title: "Save failed", text: err?.message, variant: "danger" }));
    }
  });
}

export default {
  title: "Testing Issues",
  testingOnly: true,
  render() {
    return renderPage({ issues: [], loading: true, error: null, filter: activeFilter });
  },
  onMount(container) {
    void reloadIssues(container).catch((err) => {
      const host = container.querySelector(".content-inner") || container;
      host.innerHTML = renderPage({
        issues: [],
        loading: false,
        error: err?.message || "Failed to load issues.",
        filter: activeFilter,
      });
      bindIssuesPage(container);
    });
  },
};