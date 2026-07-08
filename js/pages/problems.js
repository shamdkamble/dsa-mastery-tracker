import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { DifficultyBadge, Button, Chip, EmptyState } from "../components/ui/index.js";
import { getProblems } from "../storage/db.js";
import { formatRelativeTime } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { openProblemModal } from "../components/problem-modal.js";
import { getProblemLeetcodeUrl, leetcodeIconLink } from "../components/leetcode-actions.js";

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

function problemRow(p, i) {
  return `
    <tr
      data-problem-row
      data-id="${p.id}"
      data-difficulty="${p.difficulty}"
      data-topic="${p.topic?.toLowerCase() || ""}"
      data-status="${p.status}"
      class="cursor-pointer"
      tabindex="0"
      role="button"
    >
      <td data-label="Problem">
        <div class="flex items-center gap-2">
          <span class="text-tertiary font-mono text-xs">${i + 1}</span>
          <span class="table__cell-primary">${p.title}</span>
          ${p.leetcodeId ? `<span class="text-xs text-tertiary font-mono">#${p.leetcodeId}</span>` : ""}
          ${leetcodeIconLink(getProblemLeetcodeUrl(p))}
        </div>
      </td>
      <td data-label="Topic"><span class="table__cell-secondary">${p.topic || "—"}</span></td>
      <td data-label="Pattern"><span class="text-tertiary text-xs">${p.pattern || "—"}</span></td>
      <td data-label="Difficulty">${DifficultyBadge(p.difficulty)}</td>
      <td data-label="Status">${statusPill(p.status)}</td>
      <td data-label="Last Review"><span class="text-secondary text-xs">${formatRelativeTime(p.lastReviewAt)}</span></td>
      <td data-label="Attempts">
        <div class="flex items-center gap-2">
          <span class="text-tertiary text-xs font-mono">${p.attempts || "—"}</span>
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
    const mastered = problems.filter((p) => p.status === "mastered").length;
    const learning = problems.filter((p) => p.status === "learning" || p.status === "struggling").length;
    const todo = problems.filter((p) => p.status === "todo").length;

    if (!problems.length) {
      return createPage({
        title: "Problems",
        description: "Track every problem in your DSA journey — filter, sort, and monitor mastery.",
        children: EmptyState({
          title: "No problems yet",
          text: "Start building your DSA tracker by adding your first problem.",
          iconName: "problems",
          actions: `<button class="btn btn--primary" data-action="add-problem" type="button">${icon("plus")}<span>Add Problem</span></button>`,
        }),
      });
    }

    return createPage({
      title: "Problems",
      description: "Track every problem in your DSA journey — filter, sort, and monitor mastery.",
      children: `
        <div class="problems-toolbar">
          <div class="problems-filters">
            <button class="chip is-selected" data-filter="all" type="button">All</button>
            <button class="chip" data-filter="Easy" type="button">Easy</button>
            <button class="chip" data-filter="Medium" type="button">Medium</button>
            <button class="chip" data-filter="Hard" type="button">Hard</button>
            <button class="chip" data-filter="arrays" type="button">Arrays</button>
            <button class="chip" data-filter="dp" type="button">DP</button>
            <button class="chip" data-filter="graphs" type="button">Graphs</button>
            <button class="chip" data-filter="todo" type="button">To Do</button>
          </div>
          <div class="problems-summary">
            <span><strong>${problems.length}</strong> total</span>
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
                <th>Status</th><th>Last Review</th><th>Attempts</th>
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
      if (row && !e.target.closest("button")) {
        openProblemModal(row.dataset.id);
      }
    });
  },
};