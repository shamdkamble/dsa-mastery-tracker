import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, DifficultyBadge, Button, ProgressCircle, EmptyState } from "../components/ui/index.js";
import { computeStats, computeTodaysMission } from "../storage/computed.js";
import { formatMinutes } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { leetcodeLinkButton } from "../components/leetcode-actions.js";
import { buildLeetcodeUrl } from "../services/leetcode.js";

const TYPE_LABELS = {
  revision: { label: "Spaced Revisions", variant: "warning" },
  new: { label: "New Problems", variant: "accent" },
  challenge: { label: "Challenge", variant: "danger" },
};

function missionCard(item, index) {
  return `
    <div class="mission-card${item.done ? " is-done" : ""}" data-problem-id="${item.id}">
      <div class="mission-card__num">${index + 1}</div>
      <div class="mission-card__body">
        <div class="mission-card__title">${item.title}</div>
        <div class="mission-card__topic">${item.topic}</div>
      </div>
      <div class="mission-card__actions">
        ${Badge({ label: item.due, variant: item.due === "Overdue" ? "danger" : "default", size: "sm" })}
        ${DifficultyBadge(item.difficulty)}
        <span class="text-xs text-tertiary">${item.time}</span>
        ${leetcodeLinkButton(item.leetcodeUrl || buildLeetcodeUrl(item.leetcodeSlug), { label: "Solve", problemId: item.id })}
        ${!item.done
          ? `<button class="btn btn--sm btn--secondary" data-action="toggle-mission" data-id="${item.id}" type="button">Done</button>`
          : Badge({ label: "Done", variant: "success" })}
        <button class="btn btn--sm btn--ghost" data-action="edit-problem" data-id="${item.id}" type="button" aria-label="Edit">${icon("notes")}</button>
      </div>
    </div>
  `;
}

function groupMissions(mission, type) {
  const items = mission.filter((m) => m.type === type);
  if (!items.length) return "";
  const meta = TYPE_LABELS[type];
  return `
    <div class="mission-group">
      <div class="mission-group__header">
        <span class="mission-group__title">${meta.label}</span>
        ${Badge({ label: String(items.length), variant: meta.variant })}
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

    if (!total) {
      return createPage({
        title: "Today's Mission",
        description: "Your personalized daily plan — revisions, new problems, and optional challenges.",
        children: EmptyState({
          title: "No missions scheduled",
          text: "Go to Problems, add items, and enable \"Add to today's mission\" to build your plan.",
          iconName: "mission",
          actions: `
            <button class="btn btn--primary" data-action="add-problem" type="button">Add Problem</button>
            <a href="#/problems" class="btn btn--secondary">Browse Problems</a>
          `,
        }),
      });
    }

    return createPage({
      title: "Today's Mission",
      description: "Your personalized daily plan — revisions, new problems, and optional challenges.",
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
                <div class="mission-hero__stat-value">${mission.filter((m) => m.type === "revision").length}</div>
                <div class="mission-hero__stat-label">Revisions</div>
              </div>
              <div>
                <div class="mission-hero__stat-value">${mission.filter((m) => m.type === "new").length}</div>
                <div class="mission-hero__stat-label">New</div>
              </div>
              <div>
                <div class="mission-hero__stat-value">${stats.currentStreak}d</div>
                <div class="mission-hero__stat-label">Streak</div>
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
  },
};