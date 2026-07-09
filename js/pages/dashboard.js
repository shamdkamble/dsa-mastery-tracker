import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { StatCard, ProgressBar, Card, EmptyState, DifficultyBadge } from "../components/ui/index.js";
import { getUser } from "../storage/db.js";
import { getSessionUser } from "../auth/session.js";
import {
  computeStats,
  computeTodaysMission,
  computeRecentActivity,
  computeTopicProgress,
} from "../storage/computed.js";
import { formatGreeting, formatLongDate } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { renderAiLockBadge } from "../components/access-ui.js";
import { bindTeachTopicHandlers } from "../components/teach-modal.js";
import {
  canAccessAiGeneration,
  canOpenLesson,
  getRoadmapAccessHint,
  hasFullRoadmapAccess,
} from "../auth/access.js";
import { getOrderedRoadmapTopics, getPhaseById } from "../data/roadmap.js";
import { isTopicCompleted } from "../storage/roadmap-progress.js";

const ACTIVITY_PREVIEW_LIMIT = 8;
const MISSION_PREVIEW_LIMIT = 3;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value ?? "");
}

function topicTrack(topic) {
  if (topic.id?.startsWith("cpp-")) return "cpp";
  if (topic.id?.startsWith("dsa-")) return "dsa";
  return "";
}

function getContinueLearningTopic(user) {
  const ordered = getOrderedRoadmapTopics();
  return ordered.find((t) => !isTopicCompleted(t.id) && canOpenLesson(user, t))
    ?? ordered.find((t) => canOpenLesson(user, t))
    ?? null;
}

function missionSideItem(item) {
  return `
    <div class="dash-mission-side__item${item.done ? " is-done" : ""}">
      <div class="dash-mission-side__check${item.done ? " is-done" : ""}" aria-hidden="true">
        ${item.done ? icon("check") : ""}
      </div>
      <div class="dash-mission-side__body">
        <span class="dash-mission-side__item-title">${escapeHtml(item.title)}</span>
        <span class="dash-mission-side__meta">${escapeHtml(item.topic)}</span>
      </div>
    </div>
  `;
}

function activityItem(item) {
  const dotClass = item.action === "Solved" ? "success"
    : item.action === "Failed attempt" ? "danger"
    : item.action === "Reviewed" ? "warning" : "";
  return `
    <div class="activity-item activity-item--compact">
      <div class="activity-item__dot activity-item__dot--${dotClass}"></div>
      <div class="activity-item__content">
        <div class="activity-item__text">
          <strong>${escapeHtml(item.action)}</strong> ${escapeHtml(item.problem)}
          ${item.topic ? `<span class="text-tertiary"> · ${escapeHtml(item.topic)}</span>` : ""}
        </div>
        <div class="activity-item__time">${escapeHtml(item.time)}</div>
      </div>
    </div>
  `;
}

function renderContinueLearningHero(topic, user) {
  if (!topic) {
    return `
      <section class="dash-continue dash-continue--hero dash-continue--main dash-continue--empty">
        <div class="dash-continue__glow" aria-hidden="true"></div>
        <div class="dash-continue__inner">
          <span class="dash-continue__eyebrow">Continue Learning</span>
          <h2 class="dash-continue__headline">Start your roadmap</h2>
          <p class="dash-continue__text">Open the FAANG Mastery Roadmap and begin your first AI lesson.</p>
          <a href="#/roadmap" class="btn btn--primary dash-continue__cta-main">View Roadmap</a>
        </div>
      </section>
    `;
  }

  const phase = getPhaseById(topic.phase);
  const track = topicTrack(topic);
  const completed = isTopicCompleted(topic.id);
  const aiLocked = !canAccessAiGeneration(user, topic);
  const phaseLabel = phase?.title ? `Phase ${topic.phase} · ${phase.title}` : `Phase ${topic.phase}`;
  const accessHint = hasFullRoadmapAccess(user) ? "" : getRoadmapAccessHint(user);

  return `
    <section class="dash-continue dash-continue--hero dash-continue--main">
      <div class="dash-continue__glow" aria-hidden="true"></div>
      <div class="dash-continue__inner">
        <div class="dash-continue__icon" aria-hidden="true">${icon("target")}</div>
        <span class="dash-continue__eyebrow">Continue Learning${accessHint ? ` · <span class="dash-continue__tier">${escapeHtml(accessHint)}</span>` : ""}</span>
        <h2 class="dash-continue__headline">${escapeHtml(topic.name)}</h2>
        <div class="dash-continue__meta">
          <span>${escapeHtml(phaseLabel)}</span>
          ${DifficultyBadge(topic.difficulty)}
          ${aiLocked ? renderAiLockBadge() : ""}
        </div>
        <p class="dash-continue__text">
          ${aiLocked
            ? "Open this topic to continue. AI lesson generation requires Premium."
            : completed
              ? "You're on track. Review this lesson or keep moving through the roadmap."
              : "Your next recommended step — one focused lesson to keep momentum going."}
        </p>
        <button
          class="btn ${aiLocked ? "btn--secondary" : "btn--primary"} dash-continue__cta-main${aiLocked ? " dash-continue__cta--ai-locked" : ""}"
          type="button"
          data-action="teach-topic"
          data-topic-id="${escapeAttr(topic.id)}"
          data-topic-name="${escapeAttr(topic.name)}"
          data-topic-phase="${topic.phase}"
          data-topic-step="${topic.step ?? ""}"
          data-topic-difficulty="${escapeAttr(topic.difficulty)}"
          data-topic-track="${escapeAttr(track)}"
        >
          ${icon(completed ? "check" : aiLocked ? "topics" : "zap")}
          <span>${completed ? "Review Lesson" : "Start Lesson"}</span>
        </button>
        <a href="#/roadmap" class="dash-continue__link">Browse full roadmap →</a>
      </div>
    </section>
  `;
}

function renderMissionSide(mission, missionPercent, doneCount) {
  if (!mission.length) {
    return `
      <section class="dash-mission-side dash-mission-side--empty">
        <div class="dash-mission-side__head">
          <h2 class="dash-mission-side__title">${icon("mission")} Today's Mission</h2>
        </div>
        <p class="dash-mission-side__empty-text">Build a daily plan by adding problems to your mission.</p>
        <button class="btn btn--primary btn--sm dash-mission-side__cta" data-action="add-problem" type="button">
          ${icon("plus")}<span>Add Your First Mission</span>
        </button>
      </section>
    `;
  }

  const preview = mission.slice(0, MISSION_PREVIEW_LIMIT);

  return `
    <section class="dash-mission-side">
      <div class="dash-mission-side__head">
        <h2 class="dash-mission-side__title">${icon("mission")} Today's Mission</h2>
        <span class="dash-mission-side__stat">${doneCount}/${mission.length}</span>
      </div>
      <div class="dash-mission-side__progress">
        ${ProgressBar({
          value: missionPercent,
          variant: missionPercent === 100 ? "success" : "",
          showValue: false,
        })}
      </div>
      <div class="dash-mission-side__list">
        ${preview.map(missionSideItem).join("")}
      </div>
      <a href="#/mission" class="btn btn--secondary btn--sm dash-mission-side__cta">View All</a>
    </section>
  `;
}

export default {
  title: "Dashboard",
  render() {
    const sessionUser = getSessionUser();
    const profile = getUser();
    const stats = computeStats();
    const mission = computeTodaysMission();
    const activity = computeRecentActivity(ACTIVITY_PREVIEW_LIMIT);
    const topics = computeTopicProgress();
    const continueTopic = getContinueLearningTopic(sessionUser);
    const displayName = sessionUser?.name || profile.name || "Learner";
    const firstName = displayName.split(" ")[0] || "there";
    const accountLabel = sessionUser?.email
      ? `<span class="text-tertiary">${escapeHtml(sessionUser.email)}</span>`
      : "";
    const doneCount = mission.filter((m) => m.done).length;
    const missionPercent = mission.length ? Math.round((doneCount / mission.length) * 100) : 0;

    return createPage({
      title: "",
      children: `
        <div class="page-greeting page-greeting--dash animate-fade-in-up">
          <div>
            <h1 class="page-greeting__title">${formatGreeting()}, ${escapeHtml(firstName)}</h1>
            <p class="page-greeting__subtitle">
              ${stats.currentStreak > 0
                ? `${stats.currentStreak}-day streak — keep showing up.`
                : "Consistency beats intensity. One step today is enough."}
            </p>
            <div class="page-greeting__meta">
              ${icon("calendar")} ${formatLongDate()}
              <span aria-hidden="true">·</span>
              ${icon("clock")} ${stats.studyTimeToday} studied
              ${accountLabel ? `<span aria-hidden="true">·</span> ${accountLabel}` : ""}
            </div>
          </div>
          <div class="page-greeting__actions">
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

        <div class="dash-body">
          <div class="dash-body__main">
            ${renderContinueLearningHero(continueTopic, sessionUser)}

            <section class="page-section page-section--flush dash-topics-section">
              <div class="page-section__header">
                <h2 class="page-section__title">Topic Mastery</h2>
                <a href="#/patterns" class="page-section__link">All patterns →</a>
              </div>
              ${topics.length ? Card({
                variant: "compact",
                body: `<div class="dash-topics">${topics.map((t) => ProgressBar({
                  label: t.name,
                  value: t.percent,
                  variant: t.percent >= 80 ? "success" : t.percent >= 65 ? "warning" : "danger",
                  showValue: true,
                })).join("")}</div>`,
              }) : EmptyState({
                title: "No topics yet",
                text: "Add problems with topics to see your mastery breakdown.",
                iconName: "topics",
                compact: true,
                flat: true,
              })}
            </section>
          </div>

          <aside class="dash-body__aside">
            ${renderMissionSide(mission, missionPercent, doneCount)}

            <section class="page-section page-section--flush dash-activity">
              <div class="page-section__header">
                <h2 class="page-section__title">Recent Activity</h2>
                ${activity.length ? '<a href="#/calendar" class="page-section__link">View all →</a>' : ""}
              </div>
              ${activity.length ? Card({
                variant: "compact",
                className: "dash-activity__card",
                body: `<div class="dash-activity__scroll">${activity.map(activityItem).join("")}</div>`,
              }) : EmptyState({
                title: "No activity yet",
                text: "Solve problems and your activity will appear here.",
                iconName: "progress",
                compact: true,
                flat: true,
              })}
            </section>
          </aside>
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
    bindTeachTopicHandlers(container);
  },
};