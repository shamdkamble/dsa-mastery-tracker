import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { DifficultyBadge, EmptyState, Badge } from "../components/ui/index.js";
import {
  getProblems,
  sortProblemsForDisplay,
} from "../storage/db.js";
import { isProblemMarkedDone } from "../storage/computed.js";
import { isRevisionDue, getRevisionRoundLabel } from "../storage/revision-schedule.js";
import { todayKey } from "../storage/helpers.js";
import { formatRelativeTime, formatMinutes, formatDateLabel } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { initSolvedSolutionTriggers } from "../components/solved-solution-modal.js";
import { getProblemLeetcodeUrl, leetcodeLinkButton } from "../components/leetcode-actions.js";
import {
  renderSolveTimeCell,
  isSolveTimerActive,
  initSolveTimerTicker,
  stopSolveTimerTicker,
} from "../components/solve-timer.js";
import {
  renderPageSearch,
  bindPageSearchInput,
  normalizeSearchQuery,
} from "../utils/page-search.js";

const STATUS_MAP = {
  mastered: { label: "Mastered", class: "mastered" },
  learning: { label: "Learning", class: "learning" },
  struggling: { label: "Struggling", class: "struggling" },
  todo: { label: "To Do", class: "todo" },
};

const TAB_STORAGE_KEY = "dsa-problems-tab";

function sortSolvedProblems(problems) {
  return [...problems].sort((a, b) => {
    const tb = new Date(b.solvedAt || b.updatedAt || b.createdAt || 0).getTime();
    const ta = new Date(a.solvedAt || a.updatedAt || a.createdAt || 0).getTime();
    return tb - ta;
  });
}

function statusPill(status) {
  const s = STATUS_MAP[status] || STATUS_MAP.todo;
  return `<span class="status-pill status-pill--${s.class}">${s.label}</span>`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function problemSearchText(p) {
  return [p.title, p.topic, p.pattern, p.leetcodeId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function complexitySummary(p) {
  const time = p.timeComplexity?.trim();
  const space = p.spaceComplexity?.trim();
  if (time && space) return `${time} · ${space}`;
  return time || space || "—";
}

function activeProblemRow(p, i) {
  const lcUrl = getProblemLeetcodeUrl(p);
  const isRoadmap = p.source === "roadmap";
  const inProgress = isSolveTimerActive(p);

  return `
    <tr
      data-problem-row
      data-list="active"
      data-id="${p.id}"
      data-difficulty="${p.difficulty}"
      data-topic="${p.topic?.toLowerCase() || ""}"
      data-status="${p.status}"
      data-source="${p.source || "manual"}"
      data-search="${escapeAttr(problemSearchText(p))}"
      class="${inProgress ? "is-solving" : ""}"
    >
      <td data-label="Problem">
        <div class="flex items-center gap-2">
          <span class="text-tertiary font-mono text-xs">${i + 1}</span>
          <span class="table__cell-primary">${p.title}</span>
          ${p.leetcodeId ? `<span class="text-xs text-tertiary font-mono">#${p.leetcodeId}</span>` : ""}
          ${isRoadmap ? Badge({ label: "Roadmap", variant: "accent", size: "sm" }) : ""}
          ${inProgress ? Badge({ label: "Timer running", variant: "warning", size: "sm" }) : ""}
        </div>
      </td>
      <td data-label="Topic"><span class="table__cell-secondary">${p.topic || "—"}</span></td>
      <td data-label="Pattern"><span class="text-tertiary text-xs">${p.pattern || "—"}</span></td>
      <td data-label="Difficulty">${DifficultyBadge(p.difficulty)}</td>
      <td data-label="Status">${statusPill(p.status)}</td>
      <td data-label="Solve Time">${renderSolveTimeCell(p)}</td>
      <td data-label="Last Review"><span class="text-secondary text-xs">${formatRelativeTime(p.lastReviewAt)}</span></td>
      <td data-label="Actions">
        <div class="flex items-center gap-2">
          ${lcUrl ? leetcodeLinkButton(lcUrl, { size: "xs", label: "Solve", problemId: p.id }) : ""}
          ${inProgress ? `<button class="btn btn--xs btn--primary" data-action="mark-solved" data-id="${p.id}" type="button">Done</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function revisionStatusLabel(p) {
  const today = todayKey();
  if (isRevisionDue(p, today)) {
    return Badge({ label: "Revision due", variant: "warning", size: "sm" });
  }
  if (p.nextReviewAt) {
    const dueDate = p.nextReviewAt.slice(0, 10);
    if (dueDate > today) {
      return `<span class="text-xs text-tertiary">Next: ${formatDateLabel(p.nextReviewAt)}</span>`;
    }
  }
  if ((p.reviewStage ?? 0) > 0) {
    return `<span class="text-xs text-tertiary">${getRevisionRoundLabel(p.reviewStage)}</span>`;
  }
  return `<span class="text-xs text-tertiary">—</span>`;
}

function solvedProblemRow(p, i) {
  const solveTime = p.actualSolveMinutes != null
    ? formatMinutes(p.actualSolveMinutes)
    : "—";

  return `
    <tr
      data-problem-row
      data-list="solved"
      data-id="${p.id}"
      data-difficulty="${p.difficulty}"
      data-topic="${p.topic?.toLowerCase() || ""}"
      data-search="${escapeAttr(problemSearchText(p))}"
    >
      <td data-label="Problem">
        <div class="flex items-center gap-2">
          <span class="text-tertiary font-mono text-xs">${i + 1}</span>
          <span class="table__cell-primary">${p.title}</span>
          ${p.leetcodeId ? `<span class="text-xs text-tertiary font-mono">#${p.leetcodeId}</span>` : ""}
        </div>
      </td>
      <td data-label="Topic"><span class="table__cell-secondary">${p.topic || "—"}</span></td>
      <td data-label="Pattern"><span class="text-tertiary text-xs">${p.pattern || "—"}</span></td>
      <td data-label="Difficulty">${DifficultyBadge(p.difficulty)}</td>
      <td data-label="Solve Time"><span class="text-secondary text-xs font-mono">${solveTime}</span></td>
      <td data-label="Solved"><span class="text-secondary text-xs">${formatRelativeTime(p.solvedAt || p.updatedAt)}</span></td>
      <td data-label="Complexity"><span class="text-tertiary text-xs font-mono">${complexitySummary(p)}</span></td>
      <td data-label="Revision">${revisionStatusLabel(p)}</td>
      <td data-label="Actions">
        <button class="btn btn--xs btn--secondary" data-action="view-solved-solution" data-id="${p.id}" type="button">
          ${icon("notes")}<span>View</span>
        </button>
      </td>
    </tr>
  `;
}

function renderTabSwitcher(activeCount, solvedCount, currentTab) {
  return `
    <div class="problems-tabs" role="tablist" aria-label="Problem lists">
      <button
        type="button"
        class="problems-tabs__btn${currentTab === "active" ? " is-selected" : ""}"
        data-problems-tab="active"
        role="tab"
        aria-selected="${currentTab === "active"}"
      >
        Active
        <span class="problems-tabs__count">${activeCount}</span>
      </button>
      <button
        type="button"
        class="problems-tabs__btn${currentTab === "solved" ? " is-selected" : ""}"
        data-problems-tab="solved"
        role="tab"
        aria-selected="${currentTab === "solved"}"
      >
        Solved
        <span class="problems-tabs__count">${solvedCount}</span>
      </button>
    </div>
  `;
}

function renderActivePanel(activeProblems, stats) {
  if (!activeProblems.length) {
    return `
      <div class="problems-panel" data-problems-panel="active">
        ${EmptyState({
          title: "No active problems",
          text: stats.solvedCount
            ? "You've solved everything in your list — check the Solved tab or add more problems."
            : "Add a problem manually, or complete a roadmap lesson to get recommended practice problems.",
          iconName: "problems",
          actions: `<button class="btn btn--primary" data-action="add-problem" data-tour="add-problem" type="button">${icon("plus")}<span>Add Problem</span></button>`,
        })}
      </div>
    `;
  }

  return `
    <div class="problems-panel" data-problems-panel="active">
      <div class="problems-toolbar">
        <div class="problems-toolbar__main">
          <div class="problems-filters">
            <button class="chip is-selected" data-filter="all" type="button">All</button>
            <button class="chip" data-filter="roadmap" type="button">Roadmap</button>
            <button class="chip" data-filter="Easy" type="button">Easy</button>
            <button class="chip" data-filter="Medium" type="button">Medium</button>
            <button class="chip" data-filter="Hard" type="button">Hard</button>
            <button class="chip" data-filter="todo" type="button">To Do</button>
            <button class="chip" data-filter="learning" type="button">In Progress</button>
          </div>
          ${renderPageSearch({
            id: "problems-search",
            placeholder: "Search active problems…",
            tourAttr: "page-search",
          })}
        </div>
        <div class="problems-summary">
          <span><strong>${activeProblems.length}</strong> active</span>
          <span><strong>${stats.learning}</strong> in progress</span>
          <span><strong>${stats.todo}</strong> todo</span>
        </div>
      </div>

      <div class="problems-table-actions">
        <button class="btn btn--primary btn--sm" data-action="add-problem" data-tour="add-problem" type="button">
          ${icon("plus")}<span>Add Problem</span>
        </button>
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
            ${activeProblems.map((p, i) => activeProblemRow(p, i)).join("")}
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-6">
        <span class="text-sm text-secondary">
          Showing <span data-problems-visible-count>${activeProblems.length}</span>
          of ${activeProblems.length} active problem${activeProblems.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  `;
}

function renderSolvedPanel(solvedProblems) {
  if (!solvedProblems.length) {
    return `
      <div class="problems-panel" data-problems-panel="solved" hidden>
        ${EmptyState({
          title: "No solved problems yet",
          text: "When you mark a problem Done with your solution, it moves here for revision and performance tracking.",
          iconName: "check",
        })}
      </div>
    `;
  }

  return `
    <div class="problems-panel" data-problems-panel="solved" hidden>
      <div class="problems-toolbar">
        <div class="problems-toolbar__main">
          ${renderPageSearch({
            id: "solved-problems-search",
            placeholder: "Search solved problems…",
          })}
        </div>
        <div class="problems-summary">
          <span><strong>${solvedProblems.length}</strong> solved</span>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="table table--interactive">
          <thead>
            <tr>
              <th>Problem</th><th>Topic</th><th>Pattern</th><th>Difficulty</th>
              <th>Solve Time</th><th>Solved</th><th>Complexity</th><th>Revision</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${solvedProblems.map((p, i) => solvedProblemRow(p, i)).join("")}
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-6">
        <span class="text-sm text-secondary">
          Showing <span data-solved-visible-count>${solvedProblems.length}</span>
          of ${solvedProblems.length} solved problem${solvedProblems.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  `;
}

function getDefaultTab(solvedCount) {
  try {
    const stored = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (stored === "active" || stored === "solved") return stored;
  } catch {
    /* ignore */
  }
  return solvedCount > 0 ? "active" : "active";
}

function partitionProblems(problems) {
  const active = sortProblemsForDisplay(problems.filter((p) => !isProblemMarkedDone(p)));
  const solved = sortSolvedProblems(problems.filter(isProblemMarkedDone));
  return { active, solved };
}

export default {
  title: "Problems",
  render() {
    const allProblems = getProblems();
    const { active, solved } = partitionProblems(allProblems);
    const currentTab = getDefaultTab(solved.length);
    const learning = active.filter((p) => p.status === "learning" || p.status === "struggling").length;
    const todo = active.filter((p) => p.status === "todo").length;
    const stats = { learning, todo, solvedCount: solved.length };

    if (!allProblems.length) {
      return createPage({
        title: "Problems",
        description: "Track every problem in your DSA journey — solve actively, review solved work.",
        children: EmptyState({
          title: "No problems yet",
          text: "Add a problem manually, or complete a roadmap lesson to get recommended practice problems.",
          iconName: "problems",
          actions: `<button class="btn btn--primary" data-action="add-problem" data-tour="add-problem" type="button">${icon("plus")}<span>Add Problem</span></button>`,
        }),
      });
    }

    const showActive = currentTab === "active";
    const activePanel = renderActivePanel(active, stats).replace(
      'data-problems-panel="active"',
      `data-problems-panel="active"${showActive ? "" : " hidden"}`,
    );
    const solvedPanel = renderSolvedPanel(solved).replace(
      'data-problems-panel="solved" hidden',
      `data-problems-panel="solved"${showActive ? " hidden" : ""}`,
    );

    return createPage({
      title: "Problems",
      description: "Track every problem in your DSA journey — solve actively, review solved work.",
      children: `
        ${renderTabSwitcher(active.length, solved.length, currentTab)}

        <div class="problems-panels" data-problems-panels data-current-tab="${currentTab}">
          ${activePanel}
          ${solvedPanel}
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
    initSolveTimerTicker(container);
    initSolvedSolutionTriggers(container);
    mountProblemsPage(container);

    if (container.dataset.problemsTabsBound) return;
    container.dataset.problemsTabsBound = "true";

    container.addEventListener("click", (e) => {
      const tabBtn = e.target.closest("[data-problems-tab]");
      if (tabBtn) {
        switchProblemsTab(container, tabBtn.dataset.problemsTab);
        return;
      }

      const chip = e.target.closest("[data-filter]");
      if (chip) {
        container.querySelectorAll("[data-filter]").forEach((c) => c.classList.remove("is-selected"));
        chip.classList.add("is-selected");
        applyActiveFilters(container);
      }
    });
  },
  onUnmount() {
    stopSolveTimerTicker();
  },
};

function switchProblemsTab(container, tab) {
  const panels = container.querySelector("[data-problems-panels]");
  if (!panels) return;

  panels.dataset.currentTab = tab;
  try {
    sessionStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    /* ignore */
  }

  container.querySelectorAll("[data-problems-tab]").forEach((btn) => {
    const selected = btn.dataset.problemsTab === tab;
    btn.classList.toggle("is-selected", selected);
    btn.setAttribute("aria-selected", String(selected));
  });

  container.querySelectorAll("[data-problems-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.problemsPanel !== tab;
  });

  if (tab === "active") applyActiveFilters(container);
  else applySolvedFilters(container);
}

function getSelectedProblemFilter(container) {
  const chip = container.querySelector("[data-filter].is-selected");
  return chip?.dataset.filter || "all";
}

function problemRowMatchesFilter(row, filter) {
  return filter === "all"
    || (filter === "roadmap" && row.dataset.source === "roadmap")
    || row.dataset.difficulty === filter
    || row.dataset.topic?.includes(filter)
    || row.dataset.status === filter;
}

function applyActiveFilters(container) {
  const panel = container.querySelector('[data-problems-panel="active"]');
  if (!panel || panel.hidden) return;

  const input = container.querySelector("#problems-search");
  const filter = getSelectedProblemFilter(container);
  const q = normalizeSearchQuery(input?.value);
  const rows = panel.querySelectorAll('[data-problem-row][data-list="active"]');
  let visible = 0;

  rows.forEach((row) => {
    const filterMatch = problemRowMatchesFilter(row, filter);
    const searchMatch = !q || (row.dataset.search || "").includes(q);
    const show = filterMatch && searchMatch;
    row.hidden = !show;
    if (show) visible += 1;
  });

  const countEl = panel.querySelector("[data-problems-visible-count]");
  if (countEl) countEl.textContent = String(visible);
}

function applySolvedFilters(container) {
  const panel = container.querySelector('[data-problems-panel="solved"]');
  if (!panel || panel.hidden) return;

  const input = container.querySelector("#solved-problems-search");
  const q = normalizeSearchQuery(input?.value);
  const rows = panel.querySelectorAll('[data-problem-row][data-list="solved"]');
  let visible = 0;

  rows.forEach((row) => {
    const searchMatch = !q || (row.dataset.search || "").includes(q);
    row.hidden = !searchMatch;
    if (searchMatch) visible += 1;
  });

  const countEl = panel.querySelector("[data-solved-visible-count]");
  if (countEl) countEl.textContent = String(visible);
}

function mountProblemsPage(container) {
  const activeSearch = container.querySelector("#problems-search");
  if (activeSearch) {
    bindPageSearchInput(activeSearch, () => applyActiveFilters(container));
    applyActiveFilters(container);
  }

  const solvedSearch = container.querySelector("#solved-problems-search");
  if (solvedSearch) {
    bindPageSearchInput(solvedSearch, () => applySolvedFilters(container));
    applySolvedFilters(container);
  }
}