import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Button, Card, StatCard, EmptyState } from "../components/ui/index.js";
import { getCalendarMonth } from "../storage/db.js";
import { computeStats, computeCalendarDays, computeUpcomingReviews } from "../storage/computed.js";
import { monthLabel } from "../storage/helpers.js";
import { bindPageHandlers } from "../controllers/page-controller.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function renderCalendarDay(d) {
  const dots = [];
  if (d.activity > 0 && !d.isFuture) {
    for (let i = 0; i < d.activity; i++) {
      dots.push(`<span class="calendar-day__dot${i > 0 ? ` calendar-day__dot--l${i + 1}` : ""}"></span>`);
    }
  }
  if (d.hasReview && !d.isFuture) {
    dots.push('<span class="calendar-day__dot calendar-day__dot--review"></span>');
  }

  return `
    <div class="calendar-day${d.isToday ? " is-today" : ""}${d.isWeekend ? " is-weekend" : ""}${d.isFuture ? " is-future" : ""}">
      <span>${d.day}</span>
      ${dots.length ? `<div class="calendar-day__dots">${dots.join("")}</div>` : ""}
    </div>
  `;
}

export default {
  title: "Calendar",
  render() {
    const { year, month } = getCalendarMonth();
    const { days, firstDow } = computeCalendarDays(year, month);
    const stats = computeStats();
    const reviews = computeUpcomingReviews();
    const activeDays = days.filter((d) => d.activity > 0 && !d.isFuture).length;

    return createPage({
      title: "Calendar",
      description: "Visualize your study consistency, streaks, and upcoming spaced-repetition reviews.",
      children: `
        <div class="dash-stats mb-6" style="grid-template-columns: repeat(3, 1fr)">
          ${StatCard({ label: "Active Days", value: String(activeDays), change: monthLabel(year, month), icon: icon("calendar") })}
          ${StatCard({ label: "Current Streak", value: `${stats.currentStreak}d`, change: `Best: ${stats.longestStreak}d`, changeType: stats.currentStreak > 0 ? "up" : undefined, icon: icon("flame") })}
          ${StatCard({ label: "Reviews Due", value: String(stats.revisionsDue), change: "upcoming", icon: icon("repeat") })}
        </div>

        <div class="calendar-layout">
          <div>
            <div class="chart-card">
              <div class="calendar-header">
                <h3 class="calendar-header__month">${monthLabel(year, month)}</h3>
                <div class="cluster">
                  <button class="btn btn--ghost btn--sm" data-cal-prev type="button" aria-label="Previous month">${icon("chevronLeft")}</button>
                  <button class="btn btn--secondary btn--sm" data-cal-today type="button">Today</button>
                  <button class="btn btn--ghost btn--sm calendar-next-btn" data-cal-next type="button" aria-label="Next month">${icon("chevronLeft")}</button>
                </div>
              </div>
              <div class="calendar-grid">
                ${WEEKDAYS.map((d) => `<div class="calendar-grid__head">${d}</div>`).join("")}
                ${Array(firstDow).fill("<div></div>").join("")}
                ${days.map(renderCalendarDay).join("")}
              </div>
              <div class="heatmap-legend">
                <span>Less</span>
                <div class="heatmap-legend__cells">
                  <div class="heatmap-legend__cell"></div>
                  <div class="heatmap-legend__cell heatmap-legend__cell--1"></div>
                  <div class="heatmap-legend__cell heatmap-legend__cell--2"></div>
                  <div class="heatmap-legend__cell heatmap-legend__cell--3"></div>
                </div>
                <span>More</span>
                <span style="margin-left:1rem">·</span>
                <span class="calendar-day__dot calendar-day__dot--review" style="display:inline-block"></span>
                <span>Review due</span>
              </div>
            </div>
          </div>

          <div>
            <section class="page-section">
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
          </div>
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
  },
};