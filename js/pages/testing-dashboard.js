import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Card, EmptyState, SkeletonTable } from "../components/ui/index.js";
import {
  testingSubnav,
  testingHero,
  testingStatCard,
  issueStatusBadge,
  issueSeverityBadge,
} from "../components/testing-shell.js";
import { getSessionUser, isAdmin } from "../auth/session.js";

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderRecentIssue(issue) {
  return `
    <a href="#/testing-issues" class="testing-recent__item" data-issue-id="${issue.id}">
      <div class="testing-recent__head">
        <span class="testing-recent__id">#${issue.issueNumber}</span>
        ${issueStatusBadge(issue.status)}
        ${issueSeverityBadge(issue.severity)}
      </div>
      <div class="testing-recent__title">${escapeHtml(issue.title)}</div>
      <div class="testing-recent__meta">
        <span>${escapeHtml(issue.pageArea || "General")}</span>
        <span>·</span>
        <span>${formatDate(issue.updatedAt)}</span>
      </div>
    </a>
  `;
}

function renderShell({ stats, issues, loading, error }) {
  const user = getSessionUser();
  const firstName = user?.name?.split(" ")[0] || "Tester";
  const openCount = (stats?.pending || 0) + (stats?.in_progress || 0) + (stats?.fixed || 0);

  const statsGrid = loading
    ? `<div class="testing-stats testing-stats--loading">${Array(4).fill('<div class="skeleton skeleton--card"></div>').join("")}</div>`
    : `
      <div class="testing-stats stagger-children">
        ${testingStatCard({ iconName: "clock", value: String(stats?.pending || 0), label: "Pending", variant: "warning", hint: "Awaiting triage" })}
        ${testingStatCard({ iconName: "zap", value: String(stats?.in_progress || 0), label: "In Progress", variant: "accent", hint: "Admin is fixing" })}
        ${testingStatCard({ iconName: "alertCircle", value: String(stats?.fixed || 0), label: "Awaiting Verify", variant: "info", hint: "Confirm when fixed" })}
        ${testingStatCard({ iconName: "check", value: String(stats?.resolved || 0), label: "Resolved", variant: "success", hint: "Closed & verified" })}
      </div>
    `;

  const recent = issues
    .filter((i) => i.status !== "resolved")
    .slice(0, 6);

  const resolvedRecent = issues
    .filter((i) => i.status === "resolved")
    .slice(0, 4);

  return createPage({
    hideHeader: true,
    children: `
      <div class="testing-page testing-page--modern" data-testing-dashboard>
        ${testingHero({
          title: `Welcome back, ${escapeHtml(firstName)}`,
          description: isAdmin()
            ? "Monitor QA health, triage issues, and track fixes across the app."
            : "Report bugs, track fixes, and confirm when issues are truly resolved.",
          badge: isAdmin() ? "QA Admin" : "QA Tester",
        })}
        ${testingSubnav("dashboard")}

        ${error ? `<div class="testing-alert testing-alert--danger">${escapeHtml(error)}</div>` : ""}

        ${statsGrid}

        <div class="testing-dash-grid">
          <section class="testing-panel">
            <div class="testing-panel__header">
              <h2 class="testing-panel__title">${icon("alertTriangle")}<span>Active Issues</span></h2>
              <span class="testing-panel__count">${openCount} open</span>
            </div>
            ${loading ? SkeletonTable({ rows: 4 })
              : recent.length ? Card({
                variant: "compact",
                className: "testing-recent",
                body: `<div class="testing-recent__list">${recent.map(renderRecentIssue).join("")}</div>`,
              }) : EmptyState({
                title: "No active issues",
                text: "Everything looks clean — log a new issue when you spot something.",
                iconName: "check",
                compact: true,
                flat: true,
              })}
            <a href="#/testing-issues" class="btn btn--primary btn--sm testing-panel__cta">
              ${icon("plus")}<span>Report Issue</span>
            </a>
          </section>

          <section class="testing-panel">
            <div class="testing-panel__header">
              <h2 class="testing-panel__title">${icon("check")}<span>Recently Resolved</span></h2>
              <span class="testing-panel__count">${stats?.resolved || 0} total</span>
            </div>
            ${loading ? SkeletonTable({ rows: 3 })
              : resolvedRecent.length ? Card({
                variant: "compact",
                className: "testing-recent testing-recent--muted",
                body: `<div class="testing-recent__list">${resolvedRecent.map(renderRecentIssue).join("")}</div>`,
              }) : EmptyState({
                title: "No resolved issues yet",
                text: "Resolved issues will appear here after you confirm fixes.",
                iconName: "mission",
                compact: true,
                flat: true,
              })}
          </section>
        </div>

        ${stats?.critical ? `
          <div class="testing-critical-banner">
            ${icon("alertTriangle")}
            <div>
              <strong>${stats.critical} critical issue${stats.critical !== 1 ? "s" : ""}</strong> need attention
            </div>
            <a href="#/testing-issues?filter=critical" class="btn btn--sm btn--secondary">View</a>
          </div>
        ` : ""}
      </div>
    `,
  });
}

async function loadDashboardData() {
  const { fetchTestIssues, fetchTestIssueStats } = await import("../api/testIssuesApi.js");
  const [issuesRes, statsRes] = await Promise.all([
    fetchTestIssues(),
    fetchTestIssueStats(),
  ]);
  return {
    issues: issuesRes.issues || [],
    stats: statsRes.stats || {},
  };
}

export default {
  title: "Testing Dashboard",
  testingOnly: true,
  render() {
    return renderShell({ stats: {}, issues: [], loading: true, error: null });
  },
  onMount(container) {
    const root = container.querySelector("[data-testing-dashboard]")?.closest(".content-inner")
      || container;

    void loadDashboardData()
      .then(({ issues, stats }) => {
        const host = container.querySelector(".content-inner") || container;
        host.innerHTML = renderShell({ issues, stats, loading: false, error: null });
      })
      .catch((err) => {
        const host = container.querySelector(".content-inner") || container;
        host.innerHTML = renderShell({
          issues: [],
          stats: {},
          loading: false,
          error: err?.message || "Failed to load testing dashboard.",
        });
      });
  },
};