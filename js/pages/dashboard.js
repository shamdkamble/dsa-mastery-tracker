import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { StatCard, ProgressBar, Button, Card, EmptyState } from "../components/ui/index.js";
import { getUser } from "../storage/db.js";
import {
  computeStats,
  computeTodaysMission,
  computeRecentActivity,
  computeTopicProgress,
} from "../storage/computed.js";
import { formatGreeting, formatLongDate } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { leetcodeIconLink } from "../components/leetcode-actions.js";
import { buildLeetcodeUrl } from "../services/leetcode.js";

function missionPreviewItem(item) {
  return `
    <div class="mission-item">
      <div class="mission-item__check${item.done ? " is-done" : ""}" aria-hidden="true">
        ${item.done ? icon("check") : ""}
      </div>
      <div class="mission-item__body">
        <div class="mission-item__title">${item.title}</div>
        <div class="mission-item__meta">${item.topic}</div>
      </div>
      ${leetcodeIconLink(item.leetcodeUrl || buildLeetcodeUrl(item.leetcodeSlug))}
      <span class="mission-item__time">${item.time}</span>
    </div>
  `;
}

function activityItem(item) {
  const dotClass = item.action === "Solved" ? "success"
    : item.action === "Failed attempt" ? "danger"
    : item.action === "Reviewed" ? "warning" : "";
  return `
    <div class="activity-item">
      <div class="activity-item__dot activity-item__dot--${dotClass}"></div>
      <div>
        <div class="activity-item__text">
          <strong>${item.action}</strong> ${item.problem}
          ${item.topic ? `<span class="text-tertiary"> · ${item.topic}</span>` : ""}
        </div>
        <div class="activity-item__time">${item.time}</div>
      </div>
    </div>
  `;
}

export default {
  title: "Dashboard",
  render() {
    const user = getUser();
    const stats = computeStats();
    const mission = computeTodaysMission();
    const activity = computeRecentActivity();
    const topics = computeTopicProgress();
    const firstName = user.name?.split(" ")[0] || "there";
    const doneCount = mission.filter((m) => m.done).length;
    const missionPercent = mission.length ? Math.round((doneCount / mission.length) * 100) : 0;

    return createPage({
      title: "",
      children: `
        <div class="page-greeting animate-fade-in-up">
          <div>
            <h1 class="page-greeting__title">${formatGreeting()}, ${firstName} 👋</h1>
            <p class="page-greeting__subtitle">
              ${mission.length
                ? `You're on track — ${doneCount} of ${mission.length} missions complete today.`
                : "Add problems and assign them to today's mission to get started."}
            </p>
            <div class="page-greeting__meta">
              ${icon("calendar")} ${formatLongDate()}
              <span aria-hidden="true">·</span>
              ${icon("clock")} ${stats.studyTimeToday} studied
            </div>
          </div>
          <div class="page-greeting__actions">
            <a href="#/mission" class="btn btn--primary">View Mission</a>
            <button class="btn btn--secondary" data-action="add-problem" type="button">
              ${icon("plus")}<span>Add Problem</span>
            </button>
          </div>
        </div>

        <div class="dash-stats stagger-children">
          ${StatCard({ label: "Today's Revisions", value: String(stats.todaysRevisions), change: `${stats.revisionsDue} due total`, icon: icon("repeat") })}
          ${StatCard({ label: "Current Streak", value: `${stats.currentStreak}d`, change: `Best: ${stats.longestStreak} days`, changeType: stats.currentStreak > 0 ? "up" : undefined, icon: icon("flame") })}
          ${StatCard({ label: "Problems Solved", value: String(stats.problemsSolved), change: `+${stats.weeklySolved} this week`, changeType: stats.weeklySolved > 0 ? "up" : undefined, icon: icon("problems") })}
          ${StatCard({ label: "Accuracy Rate", value: `${stats.accuracy}%`, change: `Avg ${stats.avgTime} per solve`, icon: icon("analytics") })}
        </div>

        <div class="dash-grid">
          <div class="dash-main">
            <section class="page-section">
              <div class="page-section__header">
                <h2 class="page-section__title">Today's Mission</h2>
                <a href="#/mission" class="page-section__link">View all →</a>
              </div>
              ${mission.length ? Card({
                variant: "flush",
                body: `
                  <div class="p-4" style="border-bottom: 1px solid var(--color-border-subtle)">
                    ${ProgressBar({ label: "Daily progress", value: missionPercent, variant: "success", size: "lg" })}
                  </div>
                  ${mission.slice(0, 4).map(missionPreviewItem).join("")}
                `,
              }) : EmptyState({
                title: "No missions today",
                text: "Add problems and check \"Add to today's mission\" to build your daily plan.",
                iconName: "mission",
                compact: true,
                actions: '<button class="btn btn--primary" data-action="add-problem" type="button">Add Problem</button>',
              })}
            </section>

            <section class="page-section">
              <div class="page-section__header">
                <h2 class="page-section__title">Topic Mastery</h2>
                <a href="#/patterns" class="page-section__link">All patterns →</a>
              </div>
              ${topics.length ? `<div class="stack stack-md">${topics.map((t) => ProgressBar({
                label: t.name,
                value: t.percent,
                variant: t.percent >= 80 ? "success" : t.percent >= 65 ? "warning" : "danger",
                showValue: true,
              })).join("")}</div>` : EmptyState({
                title: "No topics yet",
                text: "Add problems with topics to see your mastery breakdown.",
                iconName: "topics",
                compact: true,
                flat: true,
              })}
            </section>
          </div>

          <div class="dash-side">
            <div class="streak-card mb-6 animate-scale-in">
              <div class="streak-card__flame">🔥</div>
              <div class="streak-card__count">${stats.currentStreak}</div>
              <div class="streak-card__label">day streak</div>
              <div class="streak-card__record">Personal best: ${stats.longestStreak} days</div>
            </div>

            <section class="page-section">
              <div class="page-section__header">
                <h2 class="page-section__title">Recent Activity</h2>
              </div>
              ${activity.length ? Card({
                variant: "compact",
                body: activity.map(activityItem).join(""),
              }) : EmptyState({
                title: "No activity yet",
                text: "Solve problems and your activity will appear here.",
                iconName: "progress",
                compact: true,
                flat: true,
              })}
            </section>
          </div>
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
  },
};