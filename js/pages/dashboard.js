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
import { bindTeachTopicHandlers } from "../components/teach-modal.js";
import { leetcodeIconLink } from "../components/leetcode-actions.js";
import { buildLeetcodeUrl } from "../services/leetcode.js";
import { getOrderedRoadmapTopics, getPhaseById } from "../data/roadmap.js";
import { isTopicCompleted } from "../storage/roadmap-progress.js";

const ACTIVITY_PREVIEW_LIMIT = 5;
const MISSION_PREVIEW_LIMIT = 5;

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

function getContinueLearningTopic() {
  const ordered = getOrderedRoadmapTopics();
  return ordered.find((t) => !isTopicCompleted(t.id)) ?? ordered[0] ?? null;
}

function missionPreviewItem(item) {
  return `
    <div class="mission-item">
      <div class="mission-item__check${item.done ? " is-done" : ""}" aria-hidden="true">
        ${item.done ? icon("check") : ""}
      </div>
      <div class="mission-item__body">
        <div class="mission-item__title">${escapeHtml(item.title)}</div>
        <div class="mission-item__meta">${escapeHtml(item.topic)}</div>
      </div>
      ${leetcodeIconLink(item.leetcodeUrl || buildLeetcodeUrl(item.leetcodeSlug))}
      <span class="mission-item__time">${escapeHtml(item.time)}</span>
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

function renderContinueLearningCard(topic) {
  if (!topic) {
    return EmptyState({
      title: "Roadmap ready",
      text: "Open the FAANG Mastery Roadmap to start your learning path.",
      iconName: "target",
      compact: true,
      flat: true,
      actions: '<a href="#/roadmap" class="btn btn--primary btn--sm">View Roadmap</a>',
    });
  }

  const phase = getPhaseById(topic.phase);
  const track = topicTrack(topic);
  const completed = isTopicCompleted(topic.id);
  const phaseLabel = phase?.title ? `Phase ${topic.phase} · ${phase.title}` : `Phase ${topic.phase}`;

  return `
    <article class="dash-continue">
      <div class="dash-continue__badge" aria-hidden="true">${icon("zap")}</div>
      <div class="dash-continue__body">
        <span class="dash-continue__eyebrow">Continue Learning</span>
        <h3 class="dash-continue__title">${escapeHtml(topic.name)}</h3>
        <div class="dash-continue__meta">
          <span>${escapeHtml(phaseLabel)}</span>
          ${DifficultyBadge(topic.difficulty)}
        </div>
        <p class="dash-continue__text">
          ${completed
            ? "Review this topic or keep momentum with the next lesson on your roadmap."
            : "Your next recommended lesson — pick up right where the roadmap leads you."}
        </p>
        <div class="dash-continue__actions">
          <button
            class="btn btn--primary btn--sm"
            type="button"
            data-action="teach-topic"
            data-topic-id="${escapeAttr(topic.id)}"
            data-topic-name="${escapeAttr(topic.name)}"
            data-topic-phase="${topic.phase}"
            data-topic-step="${topic.step ?? ""}"
            data-topic-difficulty="${escapeAttr(topic.difficulty)}"
            data-topic-track="${escapeAttr(track)}"
          >
            ${icon(completed ? "check" : "zap")}
            <span>${completed ? "Review Lesson" : "Start Lesson"}</span>
          </button>
          <a href="#/roadmap" class="btn btn--secondary btn--sm">View Roadmap</a>
        </div>
      </div>
    </article>
  `;
}

function renderMissionSection(mission, missionPercent, doneCount) {
  if (!mission.length) {
    return `
      <section class="dash-mission">
        ${EmptyState({
          title: "No missions today",
          text: "Add problems and check \"Add to today's mission\" to build your daily plan.",
          iconName: "mission",
          compact: true,
          actions: `
            <a href="#/mission" class="btn btn--secondary">Open Mission</a>
            <button class="btn btn--primary" data-action="add-problem" type="button">Add Problem</button>
          `,
        })}
      </section>
    `;
  }

  const preview = mission.slice(0, MISSION_PREVIEW_LIMIT);
  const remaining = mission.length - preview.length;

  return `
    <section class="dash-mission">
      <div class="dash-mission__shell">
        <div class="dash-mission__header">
          <div class="dash-mission__intro">
            <span class="dash-mission__eyebrow">${icon("mission")} Daily Focus</span>
            <h2 class="dash-mission__title">Today's Mission</h2>
            <p class="dash-mission__subtitle">
              ${doneCount === mission.length
                ? "All done for today — great work. Keep the streak alive tomorrow."
                : `${doneCount} of ${mission.length} complete — finish strong today.`}
            </p>
          </div>
          <a href="#/mission" class="btn btn--primary dash-mission__cta">Open Mission</a>
        </div>

        <div class="dash-mission__progress">
          ${ProgressBar({
            label: "Daily progress",
            value: missionPercent,
            variant: missionPercent === 100 ? "success" : "",
            size: "lg",
          })}
        </div>

        <div class="dash-mission__list">
          ${preview.map(missionPreviewItem).join("")}
        </div>

        ${remaining > 0 ? `
          <div class="dash-mission__footer">
            <a href="#/mission" class="page-section__link">+${remaining} more on your mission →</a>
          </div>
        ` : ""}
      </div>
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
    const continueTopic = getContinueLearningTopic();
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
                ? `${stats.currentStreak}-day streak — stay consistent and the results follow.`
                : "Small daily wins compound into interview-ready confidence."}
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

        ${renderMissionSection(mission, missionPercent, doneCount)}

        <div class="dash-layout">
          <div class="dash-layout__main">
            <section class="page-section page-section--flush">
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

          <aside class="dash-layout__side">
            ${renderContinueLearningCard(continueTopic)}

            <section class="page-section page-section--flush dash-activity">
              <div class="page-section__header">
                <h2 class="page-section__title">Recent Activity</h2>
                ${activity.length ? '<a href="#/calendar" class="page-section__link">View all →</a>' : ""}
              </div>
              ${activity.length ? Card({
                variant: "compact",
                body: `<div class="dash-activity__list">${activity.map(activityItem).join("")}</div>`,
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