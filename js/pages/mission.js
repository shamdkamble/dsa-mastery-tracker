import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, DifficultyBadge, ProgressCircle, EmptyState } from "../components/ui/index.js";
import { computeStats, computeTodaysMission } from "../storage/computed.js";
import { formatMinutes } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { leetcodeLinkButton } from "../components/leetcode-actions.js";
import { buildLeetcodeUrl } from "../services/leetcode.js";
import {
  renderSolveTimeCell,
  isSolveTimerActive,
  initSolveTimerTicker,
  stopSolveTimerTicker,
} from "../components/solve-timer.js";
import { getProblem, syncDueRevisionsToMission } from "../storage/db.js";
import { refreshPage } from "../controllers/page-controller.js";

const TYPE_LABELS = {
  revision: { label: "Spaced Revisions", variant: "warning" },
  new: { label: "New Problems", variant: "accent" },
  challenge: { label: "Challenge", variant: "danger" },
};

function missionCard(item, index) {
  const problem = getProblem(item.id) || item;

  return `
    <div class="mission-card${item.done ? " is-done" : ""}${isSolveTimerActive(problem) ? " is-solving" : ""}" data-problem-id="${item.id}">
      <div class="mission-card__num">${index + 1}</div>
      <div class="mission-card__body">
        <div class="mission-card__title">${item.title}</div>
        <div class="mission-card__topic">${item.topic}</div>
        ${item.reviewLabel ? `<div class="mission-card__meta text-xs text-tertiary">${item.reviewLabel} · spaced repetition</div>` : ""}
      </div>
      <div class="mission-card__actions">
        ${Badge({ label: item.due, variant: item.due === "Overdue" || item.due === "From yesterday" ? "danger" : item.due === "Today" ? "warning" : "default", size: "sm" })}
        ${DifficultyBadge(item.difficulty)}
        <div class="mission-card__timer">
          ${item.done
            ? `<span class="text-xs text-tertiary font-mono">${item.time}</span>`
            : renderSolveTimeCell(problem)}
        </div>
        ${!item.done
          ? leetcodeLinkButton(item.leetcodeUrl || buildLeetcodeUrl(item.leetcodeSlug), { label: "Solve", problemId: item.id })
          : ""}
        ${!item.done
          ? `<button class="btn btn--sm btn--secondary" data-action="toggle-mission" data-id="${item.id}" type="button">Done</button>`
          : Badge({ label: "Done", variant: "success" })}
        ${!item.done
          ? `<button class="btn btn--sm btn--ghost" data-action="edit-problem" data-id="${item.id}" type="button" aria-label="Edit">${icon("notes")}</button>`
          : ""}
      </div>
    </div>
  `;
}

function groupMissions(mission, type) {
  const items = mission.filter((m) => m.type === type);
  if (!items.length) return "";
  const meta = TYPE_LABELS[type];
  const remaining = items.filter((m) => !m.done).length;
  const badgeLabel = type === "new"
    ? String(remaining)
    : `${remaining}/${items.length}`;

  return `
    <div class="mission-group">
      <div class="mission-group__header">
        <span class="mission-group__title">${meta.label}</span>
        ${Badge({ label: badgeLabel, variant: meta.variant })}
      </div>
      ${items.map((item, i) => missionCard(item, i)).join("")}
    </div>
  `;
}

export default {
  title: "Today's Mission",
  render() {
    const mission = computeTodaysMission();
    const stats = computeStats();
    const done = mission.filter((m) => m.done).length;
    const total = mission.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const remainingMins = mission.filter((m) => !m.done).reduce((s, m) => s + parseInt(m.time), 0);
    const newRemaining = mission.filter((m) => m.type === "new" && !m.done).length;

    if (!total) {
      return createPage({
        title: "Today's Mission",
        description: "Your personalized daily plan — revisions, new problems, and optional challenges.",
        children: EmptyState({
          title: "No missions scheduled",
          text: "Solve problems today — they'll return automatically on day 3, 6, and 12 for spaced revision. You can also add new items from Problems.",
          iconName: "mission",
          actions: `
            <a href="#/roadmap" class="btn btn--primary">Browse Roadmap</a>
            <a href="#/problems" class="btn btn--secondary">Problems</a>
          `,
        }),
      });
    }

    return createPage({
      title: "Today's Mission",
      description: "Spaced revisions surface automatically — then new problems and optional challenges you add.",
      children: `
        <div class="mission-hero animate-fade-in-up" data-tour="mission-hero">
          <div class="mission-hero__progress">
            ${ProgressCircle({ value: percent })}
          </div>
          <div class="mission-hero__info">
            <h2 class="mission-hero__title">${done} of ${total} complete</h2>
            <p class="mission-hero__desc">${formatMinutes(remainingMins)} remaining · ${stats.studyTimeToday} studied so far today</p>
            <div class="mission-hero__stats">
              <div>
                <div class="mission-hero__stat-value">${done}</div>
                <div class="mission-hero__stat-label">Marked Done</div>
              </div>
              <div>
                <div class="mission-hero__stat-value">${newRemaining}</div>
                <div class="mission-hero__stat-label">New left</div>
              </div>
              <div>
                <div class="mission-hero__stat-value">${mission.filter((m) => m.type === "revision").length}</div>
                <div class="mission-hero__stat-label">Revisions</div>
              </div>
            </div>
          </div>
          <div>
            <button class="btn btn--primary" data-action="start-next" type="button">${icon("zap")}<span>Start Next</span></button>
          </div>
        </div>

        ${groupMissions(mission, "revision")}
        ${groupMissions(mission, "new")}
        ${groupMissions(mission, "challenge")}
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
    initSolveTimerTicker(container);

    const added = syncDueRevisionsToMission({ silent: true });
    if (added > 0) refreshPage();
  },
  onUnmount() {
    stopSolveTimerTicker();
  },
};