import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Card, StatCard, EmptyState, DifficultyBadge } from "../components/ui/index.js";
import { getCalendarMonth, getCalendarSelectedDate } from "../storage/db.js";
import {
  computeStats,
  computeCalendarDays,
  computeUpcomingReviews,
  computeProblemsSolvedOnDate,
} from "../storage/computed.js";
import { monthLabel, formatDateLabel } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";

const WEEKDAYS = [
  { short: "Su", label: "Sunday" },
  { short: "Mo", label: "Monday" },
  { short: "Tu", label: "Tuesday" },
  { short: "We", label: "Wednesday" },
  { short: "Th", label: "Thursday" },
  { short: "Fr", label: "Friday" },
  { short: "Sa", label: "Saturday" },
];

function activityLevelClass(activity) {
  if (activity >= 3) return "cal__day--lvl-3";
  if (activity === 2) return "cal__day--lvl-2";
  if (activity === 1) return "cal__day--lvl-1";
  return "cal__day--lvl-0";
}

function renderActivityDots(activity) {
  if (!activity) return "";
  const dots = [];
  for (let i = 0; i < Math.min(activity, 3); i += 1) {
    dots.push(`<span class="cal__day-dot${i > 0 ? ` cal__day-dot--l${i + 1}` : ""}"></span>`);
  }
  return `<span class="cal__day-dots" aria-hidden="true">${dots.join("")}</span>`;
}

function renderCalendarDay(d, selectedDate) {
  const isSelected = d.dateKey === selectedDate;
  const classes = [
    "cal__day",
    activityLevelClass(d.activity),
    d.isToday ? "is-today" : "",
    d.isWeekend ? "is-weekend" : "",
    d.isFuture ? "is-future" : "",
    isSelected ? "is-selected" : "",
    d.hasReview && !d.isFuture ? "has-review" : "",
  ].filter(Boolean).join(" ");

  return `
    <button
      type="button"
      class="${classes}"
      data-cal-day="${d.dateKey}"
      aria-label="${d.day}${d.solvedCount ? `, ${d.solvedCount} solved` : ""}${isSelected ? ", selected" : ""}"
      aria-pressed="${isSelected}"
      ${d.isFuture ? "disabled" : ""}
    >
      <span class="cal__day-num">${d.day}</span>
      ${!d.isFuture ? renderActivityDots(d.activity) : ""}
    </button>
  `;
}

function renderSolvedPanel(dateKey) {
  const solved = computeProblemsSolvedOnDate(dateKey);
  const label = formatDateLabel(`${dateKey}T12:00:00.000Z`);

  return `
    <section class="page-section calendar-aside__section">
      <div class="page-section__header">
        <h2 class="page-section__title">Solved on ${label}</h2>
        <span class="text-sm text-secondary">${solved.length} problem${solved.length !== 1 ? "s" : ""}</span>
      </div>
      ${solved.length ? Card({
        body: solved.map((p) => `
          <div class="review-list__item">
            <div class="review-list__date">${p.minutes ? `${p.minutes}m` : "—"}</div>
            <div>
              <div class="text-sm font-medium text-primary mb-1 flex items-center gap-2">
                <span>${p.title}</span>
                ${DifficultyBadge(p.difficulty)}
              </div>
              <div class="review-list__problems">${p.topic || "Uncategorized"}</div>
            </div>
          </div>
        `).join(""),
      }) : EmptyState({
        title: "No problems solved",
        text: "Mark mission items done or solve problems to see them on this day.",
        iconName: "problems",
        compact: true,
        flat: true,
      })}
    </section>
  `;
}

export default {
  title: "Calendar",
  render() {
    const { year, month } = getCalendarMonth();
    const selectedDate = getCalendarSelectedDate();
    const { days, firstDow } = computeCalendarDays(year, month);
    const stats = computeStats();
    const reviews = computeUpcomingReviews();
    const activeDays = days.filter((d) => d.activity > 0 && !d.isFuture).length;
    const monthSolved = days.reduce((sum, d) => sum + (d.solvedCount || 0), 0);

    return createPage({
      title: "Calendar",
      description: "Visualize your study consistency, streaks, and problems solved each day.",
      children: `
        <div class="dash-stats mb-6" style="grid-template-columns: repeat(3, 1fr)">
          ${StatCard({ label: "Active Days", value: String(activeDays), change: monthLabel(year, month), icon: icon("calendar") })}
          ${StatCard({ label: "Current Streak", value: `${stats.currentStreak}d`, change: `Best: ${stats.longestStreak}d`, changeType: stats.currentStreak > 0 ? "up" : undefined, icon: icon("flame") })}
          ${StatCard({ label: "Solved This Month", value: String(monthSolved), change: `${stats.missionDoneToday} today`, changeType: stats.missionDoneToday > 0 ? "up" : undefined, icon: icon("problems") })}
        </div>

        <div class="calendar-layout">
          <section class="cal-card" aria-label="Activity calendar">
            <div class="cal__nav">
              <div class="cal__nav-info">
                <span class="cal__eyebrow">Study activity</span>
                <h3 class="cal__month">${monthLabel(year, month)}</h3>
              </div>
              <div class="cal__nav-pills">
                <button class="cal__nav-btn" data-cal-prev type="button" aria-label="Previous month">${icon("chevronLeft")}</button>
                <button class="cal__nav-btn cal__nav-btn--today" data-cal-today type="button">Today</button>
                <button class="cal__nav-btn" data-cal-next type="button" aria-label="Next month">
                  <span class="cal__nav-btn-flip" aria-hidden="true">${icon("chevronLeft")}</span>
                </button>
              </div>
            </div>

            <div class="cal__weekdays" aria-hidden="true">
              ${WEEKDAYS.map((d) => `<span class="cal__weekday" title="${d.label}">${d.short}</span>`).join("")}
            </div>

            <div class="cal__grid">
              ${Array(firstDow).fill('<span class="cal__pad" aria-hidden="true"></span>').join("")}
              ${days.map((d) => renderCalendarDay(d, selectedDate)).join("")}
            </div>

            <div class="cal__legend">
              <div class="cal__legend-group">
                <span class="cal__legend-label">Activity</span>
                <div class="cal__legend-scale">
                  <span class="cal__legend-swatch cal__legend-swatch--0"></span>
                  <span class="cal__legend-swatch cal__legend-swatch--1"></span>
                  <span class="cal__legend-swatch cal__legend-swatch--2"></span>
                  <span class="cal__legend-swatch cal__legend-swatch--3"></span>
                </div>
              </div>
              <div class="cal__legend-group">
                <span class="cal__legend-swatch cal__legend-swatch--review"></span>
                <span class="cal__legend-label">Review due</span>
              </div>
            </div>
          </section>

          <aside class="calendar-aside">
            ${renderSolvedPanel(selectedDate)}

            <section class="page-section calendar-aside__section">
              <div class="page-section__header">
                <h2 class="page-section__title">Upcoming Reviews</h2>
              </div>
              ${reviews.length ? Card({
                body: reviews.map((r) => `
                  <div class="review-list__item">
                    <div class="review-list__date">${r.date}</div>
                    <div>
                      <div class="text-sm font-medium text-primary mb-1">${r.count} problem${r.count !== 1 ? "s" : ""}</div>
                      <div class="review-list__problems">${r.problems.join(" · ")}</div>
                    </div>
                  </div>
                `).join(""),
              }) : EmptyState({
                title: "No reviews scheduled",
                text: "Set review dates on mastered problems to see them here.",
                iconName: "repeat",
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
  },
};