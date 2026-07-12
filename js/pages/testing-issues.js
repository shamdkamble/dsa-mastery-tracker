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

function testerCanEdit(issue, user) {
  return !isAdmin()
    && issue.reporterId === user?.id
    && (issue.status === "pending" || issue.status === "in_progress");
}

function canReplyToIssue(issue, user) {
  if (!issue || !user) return false;
  if (isAdmin()) return true;
  return issue.reporterId === user.id && issue.status !== "resolved";
}

function getIssueComments(issue) {
  const comments = Array.isArray(issue?.comments) ? [...issue.comments] : [];
  if (!comments.length && issue?.adminNotes?.trim()) {
    comments.push({
      id: `legacy_${issue.id}`,
      authorName: issue.fixedByName || "Admin",
      authorRole: "admin",
      body: issue.adminNotes.trim(),
      createdAt: issue.updatedAt || issue.createdAt,
    });
  }
  return comments.sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
  );
}

function renderCommentsThread(issue) {
  const comments = getIssueComments(issue);
  if (!comments.length) {
    return `<p class="testing-thread__empty">No responses yet. Start the discussion below.</p>`;
  }

  return comments.map((comment) => `
    <article class="testing-comment testing-comment--${comment.authorRole === "admin" ? "admin" : "tester"}">
      <div class="testing-comment__head">
        <span class="testing-comment__author">${escapeHtml(comment.authorName || (comment.authorRole === "admin" ? "Admin" : "Tester"))}</span>
        <span class="testing-comment__role">${comment.authorRole === "admin" ? "Admin" : "Tester"}</span>
        <time class="testing-comment__time">${formatDate(comment.createdAt)}</time>
      </div>
      <p class="testing-comment__body">${escapeHtml(comment.body)}</p>
    </article>
  `).join("");
}

function renderActions(issue, user) {
  const admin = isAdmin();
  const actions = [];

  actions.push(`<button type="button" class="btn btn--xs btn--ghost" data-action="issue-view" data-id="${issue.id}">${icon("notes")}<span>View</span></button>`);

  if (admin) {
    if (issue.status === "pending") {
      actions.push(`<button type="button" class="btn btn--xs btn--secondary" data-action="issue-start" data-id="${issue.id}">Start Work</button>`);
    }
    if (issue.status === "pending" || issue.status === "in_progress") {
      actions.push(`<button type="button" class="btn btn--xs btn--primary" data-action="issue-fixed" data-id="${issue.id}">Mark Fixed</button>`);
    }
    actions.push(`<button type="button" class="btn btn--xs btn--ghost" data-action="issue-note" data-id="${issue.id}">${icon("message")}<span>Respond</span></button>`);
  } else {
    if (canReplyToIssue(issue, user)) {
      actions.push(`<button type="button" class="btn btn--xs btn--ghost" data-action="issue-note" data-id="${issue.id}">${icon("message")}<span>Reply</span></button>`);
    }
    if (issue.status === "fixed") {
      actions.push(`<button type="button" class="btn btn--xs btn--primary" data-action="issue-confirm" data-id="${issue.id}">Confirm Resolved</button>`);
      actions.push(`<button type="button" class="btn btn--xs btn--ghost" data-action="issue-reopen" data-id="${issue.id}">Reopen</button>`);
    }
  }

  return `<div class="testing-actions">${actions.join("")}</div>`;
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
          <div id="testing-issue-fields">
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
          </div>
          <div id="testing-modal-details" class="testing-modal-details" hidden></div>
          <section id="testing-issue-thread" class="testing-thread" hidden>
            <div class="testing-thread__head">
              <h3 class="testing-thread__title">${icon("message")}<span>Discussion</span></h3>
            </div>
            <div id="testing-issue-comments" class="testing-thread__list"></div>
          </section>
        </form>
        <div id="testing-issue-reply" class="testing-reply" hidden>
          <label class="field">
            <span class="field__label" id="testing-reply-label">Your reply</span>
            <textarea id="testing-reply-input" class="input testing-textarea" rows="3" placeholder="Write a reply for the other party…"></textarea>
          </label>
        </div>
        <div class="testing-modal__footer">
          <button type="button" class="btn btn--ghost" data-action="close-issue-modal">Cancel</button>
          <button type="button" class="btn btn--primary" id="testing-issue-reply-btn" data-action="issue-reply" hidden>Send Reply</button>
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
          description: isAdmin()
            ? "Review tester reports, respond with comments, and move issues through the fix workflow."
            : "Report defects with full context. You can edit your report until an admin marks it fixed, then confirm when it's truly resolved.",
          badge: isAdmin() ? "QA Admin" : "QA Tester",
        })}
        ${testingSubnav("issues")}

        <div class="testing-toolbar">
          <div class="testing-filters">${renderFilterChips(filter)}</div>
          <div class="testing-toolbar__actions">
            ${isAdmin() ? `
              <button type="button" class="btn btn--danger btn--sm" data-action="clear-all-issues" title="Remove every QA issue from all testers">
                ${icon("trash")}<span>Clear All Issues</span>
              </button>
            ` : `
              <button type="button" class="btn btn--primary btn--sm" data-action="open-issue-modal">
                ${icon("plus")}<span>Report Issue</span>
              </button>
            `}
          </div>
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
            text: isAdmin()
              ? "Try another filter or wait for testers to report issues."
              : "Try another filter or report a new issue.",
            iconName: "search",
            actions: isAdmin()
              ? ""
              : Button({ label: "Report Issue", variant: "primary", attrs: 'data-action="open-issue-modal" type="button"' }),
          })}
        </div>

        ${renderIssueModal()}
      </div>
    `,
  });
}

let issuesCache = [];
let activeFilter = "all";
let issuesPageAbort = null;

function paintIssuesPage(container, { issues, loading, error, filter = activeFilter }) {
  container.innerHTML = renderPage({ issues, loading, error, filter });
}

function unbindIssuesPage() {
  issuesPageAbort?.abort();
  issuesPageAbort = null;
}

async function reloadIssues(container) {
  const { fetchTestIssues } = await import("../api/testIssuesApi.js");
  const { issues } = await fetchTestIssues();
  issuesCache = issues || [];
  paintIssuesPage(container, { issues: issuesCache, loading: false, error: null, filter: activeFilter });
}

function openModal(mode = "create", issue = null, { focusReply = false } = {}) {
  const modal = document.getElementById("testing-issue-modal");
  const form = document.getElementById("testing-issue-form");
  const title = document.getElementById("testing-modal-title");
  const submit = document.getElementById("testing-issue-submit");
  const replyBtn = document.getElementById("testing-issue-reply-btn");
  const details = document.getElementById("testing-modal-details");
  const issueFields = document.getElementById("testing-issue-fields");
  const thread = document.getElementById("testing-issue-thread");
  const commentsHost = document.getElementById("testing-issue-comments");
  const replyWrap = document.getElementById("testing-issue-reply");
  const replyInput = document.getElementById("testing-reply-input");
  const replyLabel = document.getElementById("testing-reply-label");
  const user = getSessionUser();

  if (!modal || !form) return;

  form.reset();
  form.mode.value = mode;
  form.issueId.value = issue?.id || "";
  if (replyInput) replyInput.value = "";

  if (issue) {
    form.title.value = issue.title || "";
    form.pageArea.value = issue.pageArea || "";
    form.severity.value = issue.severity || "medium";
    form.description.value = issue.description || "";
    form.stepsToReproduce.value = issue.stepsToReproduce || "";
    form.expectedBehavior.value = issue.expectedBehavior || "";
    form.actualBehavior.value = issue.actualBehavior || "";
  }

  const showReply = mode === "view" && issue && canReplyToIssue(issue, user);
  const testerEditableView = mode === "view" && issue && testerCanEdit(issue, user);

  if (issueFields) issueFields.hidden = mode === "view" && !testerEditableView;
  if (thread) thread.hidden = mode !== "view";
  if (commentsHost && mode === "view" && issue) {
    commentsHost.innerHTML = renderCommentsThread(issue);
  }
  if (replyWrap) replyWrap.hidden = !showReply;
  if (replyBtn) replyBtn.hidden = !showReply;
  if (replyLabel) {
    replyLabel.textContent = isAdmin() ? "Reply to tester" : "Reply to admin";
  }

  const issueMetaHtml = issue ? `
    <div class="testing-detail-grid">
      <div><span class="testing-detail-label">Status</span>${issueStatusBadge(issue.status)}</div>
      <div><span class="testing-detail-label">Reporter</span>${escapeHtml(issue.reporterName)}</div>
      <div><span class="testing-detail-label">Fixed by</span>${escapeHtml(issue.fixedByName || "—")}</div>
      <div><span class="testing-detail-label">Fixed at</span>${formatDate(issue.fixedAt)}</div>
      <div><span class="testing-detail-label">Resolved at</span>${formatDate(issue.resolvedAt)}</div>
      <div><span class="testing-detail-label">Updated</span>${formatDate(issue.updatedAt)}</div>
    </div>
  ` : "";

  if (mode === "view" && issue) {
    title.textContent = `Issue #${issue.issueNumber}`;
    details.hidden = false;
    details.innerHTML = testerEditableView
      ? issueMetaHtml
      : `
        ${issueMetaHtml}
        <div class="testing-detail-grid">
          <div><span class="testing-detail-label">Severity</span>${issueSeverityBadge(issue.severity)}</div>
          <div><span class="testing-detail-label">Page / Area</span>${escapeHtml(issue.pageArea || "—")}</div>
        </div>
        <div class="testing-detail-notes"><span class="testing-detail-label">Title</span><p>${escapeHtml(issue.title)}</p></div>
        ${issue.description ? `<div class="testing-detail-notes"><span class="testing-detail-label">Description</span><p>${escapeHtml(issue.description)}</p></div>` : ""}
        ${issue.stepsToReproduce ? `<div class="testing-detail-notes"><span class="testing-detail-label">Steps to Reproduce</span><p class="testing-detail-pre">${escapeHtml(issue.stepsToReproduce)}</p></div>` : ""}
        ${issue.expectedBehavior ? `<div class="testing-detail-notes"><span class="testing-detail-label">Expected Behavior</span><p>${escapeHtml(issue.expectedBehavior)}</p></div>` : ""}
        ${issue.actualBehavior ? `<div class="testing-detail-notes"><span class="testing-detail-label">Actual Behavior</span><p>${escapeHtml(issue.actualBehavior)}</p></div>` : ""}
      `;

    if (testerEditableView) {
      submit.hidden = false;
      submit.textContent = "Save Changes";
      form.mode.value = "edit";
      [...form.elements].forEach((el) => {
        if (el.name && el.name !== "mode" && el.name !== "issueId") el.disabled = false;
      });
    } else {
      submit.hidden = true;
    }
  } else if (mode === "edit" && issue) {
    title.textContent = `Edit Issue #${issue.issueNumber}`;
    submit.hidden = false;
    submit.textContent = "Save Changes";
    details.hidden = true;
    if (issueFields) issueFields.hidden = false;
  } else {
    title.textContent = "Report Issue";
    submit.hidden = false;
    submit.textContent = "Submit Issue";
    details.hidden = true;
    if (issueFields) issueFields.hidden = false;
  }

  modal.hidden = false;
  document.body.classList.add("testing-modal-open");

  if (focusReply && replyInput) {
    requestAnimationFrame(() => {
      replyInput.focus();
      replyInput.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }
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
  unbindIssuesPage();
  issuesPageAbort = new AbortController();
  const { signal } = issuesPageAbort;

  container.addEventListener("click", async (e) => {
    const filterChip = e.target.closest("[data-filter]");
    if (filterChip) {
      activeFilter = filterChip.dataset.filter;
      paintIssuesPage(container, { issues: issuesCache, loading: false, error: null, filter: activeFilter });
      return;
    }

    const clearBtn = e.target.closest("[data-action='clear-all-issues']");
    if (clearBtn) {
      const count = issuesCache.length;
      const confirmed = confirm(
        "Clear all QA test issues?\n\n"
        + `This permanently deletes every issue reported by testers — pending, in progress, fixed, and resolved (${count} total). This cannot be undone.`,
      );
      if (!confirmed) return;

      clearBtn.disabled = true;
      const clearLabel = clearBtn.querySelector("span");
      const prevLabel = clearLabel?.textContent;
      if (clearLabel) clearLabel.textContent = "Clearing…";
      try {
        const { apiClearAllTestIssues } = await import("../api/testIssuesApi.js");
        if (typeof apiClearAllTestIssues !== "function") {
          throw new Error("Clear is not available yet. Hard-refresh the page (Ctrl+Shift+R) and try again.");
        }
        const { deletedCount } = await apiClearAllTestIssues();
        showToast(Toast({
          title: "QA data cleared",
          text: `Removed ${deletedCount} issue${deletedCount === 1 ? "" : "s"} from all testers.`,
          variant: "info",
        }));
        await reloadIssues(container);
      } catch (err) {
        showToast(Toast({ title: "Clear failed", text: err?.message || "Could not clear issues.", variant: "danger" }));
        clearBtn.disabled = false;
        if (clearLabel && prevLabel) clearLabel.textContent = prevLabel;
      }
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
      openModal("view", findIssue(noteBtn.dataset.id), { focusReply: true });
      return;
    }

    const replyBtn = e.target.closest("[data-action='issue-reply']");
    if (replyBtn) {
      const form = document.getElementById("testing-issue-form");
      const issueId = form?.issueId?.value;
      const replyInput = document.getElementById("testing-reply-input");
      const body = String(replyInput?.value || "").trim();
      if (!issueId || !body) {
        showToast(Toast({ title: "Reply required", text: "Write a message before sending.", variant: "warning" }));
        return;
      }

      replyBtn.disabled = true;
      try {
        const { apiUpdateTestIssue } = await import("../api/testIssuesApi.js");
        await apiUpdateTestIssue(issueId, { action: "add_comment", body });
        showToast(Toast({ title: "Reply sent", variant: "success" }));
        await reloadIssues(container);
        openModal("view", findIssue(issueId), { focusReply: true });
      } catch (err) {
        showToast(Toast({ title: "Reply failed", text: err?.message, variant: "danger" }));
      } finally {
        replyBtn.disabled = false;
      }
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
  }, { signal });

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
      } else if (mode === "edit") {
        await apiUpdateTestIssue(issueId, payload);
        showToast(Toast({ title: "Issue updated", text: "Your corrections were saved.", variant: "success" }));
      }

      closeModal();
      await reloadIssues(container);
    } catch (err) {
      showToast(Toast({ title: "Save failed", text: err?.message, variant: "danger" }));
    }
  }, { signal });
}

export default {
  title: "Testing Issues",
  testingOnly: true,
  render() {
    return renderPage({ issues: [], loading: true, error: null, filter: activeFilter });
  },
  onMount(container) {
    bindIssuesPage(container);
    void reloadIssues(container).catch((err) => {
      paintIssuesPage(container, {
        issues: [],
        loading: false,
        error: err?.message || "Failed to load issues.",
        filter: activeFilter,
      });
    });
  },
  onUnmount() {
    unbindIssuesPage();
  },
};