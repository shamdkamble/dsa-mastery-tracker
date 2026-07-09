import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { DifficultyBadge, EmptyState, Badge } from "../components/ui/index.js";
import { getProblems, getProblemsInProgress } from "../storage/db.js";
import { formatRelativeTime, formatElapsedSince } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { openProblemModal } from "../components/problem-modal.js";
import { getProblemLeetcodeUrl, leetcodeLinkButton } from "../components/leetcode-actions.js";

const STATUS_MAP = {
  mastered: { label: "Mastered", class: "mastered" },
  learning: { label: "Learning", class: "learning" },
  struggling: { label: "Struggling", class: "struggling" },
  todo: { label: "To Do", class: "todo" },
};

function statusPill(status) {
  const s = STATUS_MAP[status] || STATUS_MAP.todo;
  return `<span class="status-pill status-pill--${s.class}">${s.label}</span>`;
}

function renderInProgressBanner(inProgress) {
  if (!inProgress.length) return "";

  return `
    <div class="solve-timer-banner">
      ${inProgress.map((p) => `
        <div class="solve-timer-banner__item" data-problem-id="${p.id}">
          <div class="solve-timer-banner__info">
            <span class="solve-timer-banner__label">Solving</span>
            <strong class="solve-timer-banner__title">${p.title}</strong>
            <span class="solve-timer-banner__elapsed">${formatElapsedSince(p.startedAt)} elapsed</span>
          </div>
          <div class="solve-timer-banner__actions">
            ${leetcodeLinkButton(getProblemLeetcodeUrl(p), { size: "xs", label: "Resume", problemId: p.id })}
            <button class="btn btn--xs btn--primary" type="button" data-action="mark-solved" data-id="${p.id}">Mark Solved</button>
            <button class="btn btn--xs btn--ghost" type="button" data-action="cancel-solve" data-id="${p.id}" title="Cancel timer">×</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function problemRow(p, i) {
  const lcUrl = getProblemLeetcodeUrl(p);
  const isRoadmap = p.source === "roadmap";
  const inProgress = Boolean(p.startedAt && p.status !== "mastered");
  const solveTime = p.actualSolveMinutes
    ? `${p.actualSolveMinutes}m`
    : inProgress
      ? formatElapsedSince(p.startedAt)
      : "—";

  return `
    <tr
      data-problem-row
      data-id="${p.id}"
      data-difficulty="${p.difficulty}"
      data-topic="${p.topic?.toLowerCase() || ""}"
      data-status="${p.status}"
      data-source="${p.source || "manual"}"
      class="cursor-pointer${inProgress ? " is-solving" : ""}"
      tabindex="0"
      role="button"
    >
      <td data-label="Problem">
        <div class="flex items-center gap-2">
          <span class="text-tertiary font-mono text-xs">${i + 1}</span>
          <span class="table__cell-primary">${p.title}</span>
          ${p.leetcodeId ? `<span class="text-xs text-tertiary font-mono">#${p.leetcodeId}</span>` : ""}
          ${isRoadmap ? Badge({ label: "Roadmap", variant: "accent", size: "sm" }) : ""}
          ${inProgress ? Badge({ label: "In progress", variant: "warning", size: "sm" }) : ""}
        </div>
      </td>
      <td data-label="Topic"><span class="table__cell-secondary">${p.topic || "—"}</span></td>
      <td data-label="Pattern"><span class="text-tertiary text-xs">${p.pattern || "—"}</span></td>
      <td data-label="Difficulty">${DifficultyBadge(p.difficulty)}</td>
      <td data-label="Status">${statusPill(p.status)}</td>
      <td data-label="Solve Time"><span class="text-secondary text-xs font-mono">${solveTime}</span></td>
      <td data-label="Last Review"><span class="text-secondary text-xs">${formatRelativeTime(p.lastReviewAt)}</span></td>
      <td data-label="Actions">
        <div class="flex items-center gap-2" onclick="event.stopPropagation()">
          ${lcUrl ? leetcodeLinkButton(lcUrl, { size: "xs", label: inProgress ? "Resume" : "Solve", problemId: p.id }) : ""}
          ${inProgress ? `<button class="btn btn--xs btn--primary" data-action="mark-solved" data-id="${p.id}" type="button">Solved</button>` : ""}
          ${!p.inMission ? `<button class="btn btn--xs btn--ghost" data-action="add-to-mission" data-id="${p.id}" type="button" title="Add to mission">+</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

export default {
  title: "Problems",
  render() {
    const problems = getProblems();
    const inProgress = getProblemsInProgress();
    const mastered = problems.filter((p) => p.status === "mastered").length;
    const learning = problems.filter((p) => p.status === "learning" || p.status === "struggling").length;
    const todo = problems.filter((p) => p.status === "todo").length;
    const roadmapCount = problems.filter((p) => p.source === "roadmap").length;

    if (!problems.length) {
      return createPage({
        title: "Problems",
        description: "Track every problem in your DSA journey — filter, sort, and monitor mastery.",
        children: EmptyState({
          title: "No problems yet",
          text: "Complete a roadmap lesson to get recommended problems, or add your own.",
          iconName: "problems",
          actions: `<button class="btn btn--primary" data-action="add-problem" type="button">${icon("plus")}<span>Add Problem</span></button>`,
        }),
      });
    }

    return createPage({
      title: "Problems",
      description: "Track every problem in your DSA journey — filter, sort, and monitor mastery.",
      children: `
        ${renderInProgressBanner(inProgress)}

        <div class="problems-toolbar">
          <div class="problems-filters">
            <button class="chip is-selected" data-filter="all" type="button">All</button>
            <button class="chip" data-filter="roadmap" type="button">Roadmap</button>
            <button class="chip" data-filter="Easy" type="button">Easy</button>
            <button class="chip" data-filter="Medium" type="button">Medium</button>
            <button class="chip" data-filter="Hard" type="button">Hard</button>
            <button class="chip" data-filter="todo" type="button">To Do</button>
            <button class="chip" data-filter="learning" type="button">In Progress</button>
          </div>
          <div class="problems-summary">
            <span><strong>${problems.length}</strong> total</span>
            ${roadmapCount ? `<span><strong>${roadmapCount}</strong> from roadmap</span>` : ""}
            <span><strong>${mastered}</strong> mastered</span>
            <span><strong>${learning}</strong> in progress</span>
            <span><strong>${todo}</strong> todo</span>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table table--interactive">
            <thead>
              <tr>
                <th>Problem</th><th>Topic</th><th>Pattern</th><th>Difficulty</th>
                <th>Status</th><th>Solve Time</th><th>Last Review</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${problems.map((p, i) => problemRow(p, i)).join("")}
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between mt-6">
          <span class="text-sm text-secondary">Showing ${problems.length} problem${problems.length !== 1 ? "s" : ""}</span>
          <button class="btn btn--primary btn--sm" data-action="add-problem" type="button">
            ${icon("plus")}<span>Add Problem</span>
          </button>
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);

    if (container.dataset.problemsRowBound) return;
    container.dataset.problemsRowBound = "true";

    container.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-problem-row]");
      if (row && !e.target.closest("button") && !e.target.closest("a")) {
        openProblemModal(row.dataset.id);
      }
    });
  },
};