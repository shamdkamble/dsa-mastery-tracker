import { createPage } from "../components/page-shell.js";
import { StatCard, EmptyState } from "../components/ui/index.js";
import { icon } from "../components/icons.js";
import {
  computeStats,
  computeWeeklyActivity,
  computeDifficultyBreakdown,
  computeTopicProgress,
  hasMeaningfulTopicProgress,
} from "../storage/computed.js";
import { getProblems } from "../storage/db.js";
import { renderTopicPerformanceSection } from "../components/topic-progress.js";
import { refreshPage } from "../controllers/page-controller.js";
import { getCurrentPath } from "../router.js";

function barChart(weeklyActivity) {
  const max = Math.max(...weeklyActivity.map((d) => d.solved), 1);
  return `
    <div class="bar-chart">
      ${weeklyActivity.map((d) => {
        const height = Math.round((d.solved / max) * 100) || 4;
        return `
          <div class="bar-chart__col">
            <div class="bar-chart__bar${d.isToday ? "" : " bar-chart__bar--muted"}" style="height: ${height}%">
              <span class="bar-chart__value">${d.solved}</span>
            </div>
            <span class="bar-chart__label">${d.day}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function donutChart(stats, breakdown) {
  const total = breakdown.reduce((s, d) => s + d.count, 0);
  if (!total) {
    return EmptyState({ title: "No solved problems", text: "Mark problems as Done to see breakdown.", iconName: "analytics", compact: true, flat: true });
  }

  const easy = breakdown[0].percent;
  const medium = breakdown[1].percent;
  const hard = breakdown[2].percent;
  const gradient = `conic-gradient(
    var(--color-easy) 0% ${easy}%,
    var(--color-medium) ${easy}% ${easy + medium}%,
    var(--color-hard) ${easy + medium}% 100%
  )`;

  return `
    <div class="donut-chart">
      <div class="donut-chart__ring" style="background: ${gradient}"></div>
      <div class="donut-chart__center">
        <span class="donut-chart__total">${stats.problemsSolved}</span>
        <span class="donut-chart__label">solved</span>
      </div>
    </div>
    <div class="legend">
      ${breakdown.map((d) => `
        <div class="legend__item">
          <span class="legend__left">
            <span class="legend__dot legend__dot--${d.color}"></span>
            ${d.label}
          </span>
          <span class="legend__count">${d.count} <span class="text-tertiary">(${d.percent}%)</span></span>
        </div>
      `).join("")}
    </div>
  `;
}

export default {
  title: "Analytics",
  render() {
    const stats = computeStats();
    const weekly = computeWeeklyActivity();
    const breakdown = computeDifficultyBreakdown();
    const topics = computeTopicProgress({ limit: 8 });
    const meaningfulTopics = hasMeaningfulTopicProgress(topics);
    const uncategorized = topics.find((t) => t.isUncategorized);
    const totalMinutes = weekly.reduce((s, d) => s + d.minutes, 0);
    const totalSolved = weekly.reduce((s, d) => s + d.solved, 0);
    const problems = getProblems();

    if (!problems.length) {
      return createPage({
        title: "Analytics",
        description: "Deep insights into your problem-solving performance and growth trends.",
        children: EmptyState({
          title: "No analytics yet",
          text: "Add and solve problems to unlock performance insights.",
          iconName: "analytics",
          actions: `<button class="btn btn--primary" data-action="add-problem" type="button">Add Problem</button>`,
        }),
      });
    }

    return createPage({
      title: "Analytics",
      description: "Deep insights into your problem-solving performance and growth trends.",
      children: `
        <div class="dash-stats mb-6">
          ${StatCard({ label: "This Week", value: String(totalSolved), change: "problems solved", changeType: totalSolved > 0 ? "up" : undefined, icon: icon("analytics") })}
          ${StatCard({ label: "Study Time", value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`, change: "this week", icon: icon("clock") })}
          ${StatCard({ label: "Accuracy", value: `${stats.accuracy}%`, change: "solve vs fail ratio", icon: icon("target") })}
          ${StatCard({ label: "Avg per Solve", value: stats.avgTime, change: "estimated time", icon: icon("zap") })}
        </div>

        <div class="analytics-grid">
          <div class="chart-card">
            <h3 class="chart-card__title">Weekly Activity</h3>
            ${barChart(weekly)}
          </div>
          <div class="chart-card">
            <h3 class="chart-card__title">Difficulty Breakdown</h3>
            ${donutChart(stats, breakdown)}
          </div>
        </div>

        <div class="metric-row">
          <div class="metric-mini">
            <div class="metric-mini__value">${stats.problemsSolved}</div>
            <div class="metric-mini__label">Total Solved</div>
          </div>
          <div class="metric-mini">
            <div class="metric-mini__value">${stats.currentStreak}d</div>
            <div class="metric-mini__label">Active Streak</div>
          </div>
          <div class="metric-mini">
            <div class="metric-mini__value">${stats.totalProblems ? Math.round(stats.problemsSolved / stats.totalProblems * 100) : 0}%</div>
            <div class="metric-mini__label">Completion</div>
          </div>
        </div>

        ${renderTopicPerformanceSection(topics, {
          meaningful: meaningfulTopics,
          uncategorized,
        })}
      `,
    });
  },
  onMount(container) {
    import("../controllers/page-controller.js").then(({ bindPageHandlers }) => bindPageHandlers(container));

    if (!container.dataset.analyticsLiveBound) {
      container.dataset.analyticsLiveBound = "true";
      document.addEventListener("data:change", () => {
        if (getCurrentPath() === "analytics") refreshPage();
      });
    }
  },
};