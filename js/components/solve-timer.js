/**
 * Solve timer UI — play / reset controls and live elapsed display
 */

import { icon } from "./icons.js";
import { formatElapsedLive } from "../storage/helpers.js";

export function isSolveTimerActive(problem) {
  return Boolean(problem?.startedAt && problem.status !== "mastered");
}

export function hasRecordedSolveTime(problem) {
  return Boolean(problem?.actualSolveMinutes);
}

export function renderSolveTimeCell(problem, { locked = false } = {}) {
  const inProgress = isSolveTimerActive(problem);
  const recorded = hasRecordedSolveTime(problem);

  if (locked || (recorded && !inProgress)) {
    return `
      <div class="solve-time-cell">
        <span class="solve-time-cell__value font-mono text-secondary">${problem.actualSolveMinutes}m</span>
      </div>
    `;
  }

  if (inProgress) {
    return `
      <div class="solve-time-cell solve-time-cell--active">
        <span
          class="solve-time-cell__value font-mono text-warning"
          data-solve-timer
          data-started-at="${problem.startedAt}"
        >${formatElapsedLive(problem.startedAt)}</span>
        <div class="solve-time-cell__controls">
          <button
            class="solve-time-cell__btn"
            type="button"
            data-action="reset-solve"
            data-id="${problem.id}"
            title="Reset timer"
            aria-label="Reset timer"
          >${icon("rotateCcw")}</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="solve-time-cell">
      <span class="solve-time-cell__value font-mono text-tertiary">—</span>
      <div class="solve-time-cell__controls">
        <button
          class="solve-time-cell__btn solve-time-cell__btn--play"
          type="button"
          data-action="start-timer"
          data-id="${problem.id}"
          title="Start timer"
          aria-label="Start timer"
        >${icon("play")}</button>
        <button
          class="solve-time-cell__btn"
          type="button"
          data-action="reset-solve"
          data-id="${problem.id}"
          disabled
          title="Reset timer"
          aria-label="Reset timer"
        >${icon("rotateCcw")}</button>
      </div>
    </div>
  `;
}

let tickerId = null;

export function initSolveTimerTicker(root = document) {
  stopSolveTimerTicker();

  const tick = () => {
    root.querySelectorAll("[data-solve-timer][data-started-at]").forEach((el) => {
      el.textContent = formatElapsedLive(el.dataset.startedAt);
    });
  };

  tick();
  tickerId = window.setInterval(tick, 1000);
}

export function stopSolveTimerTicker() {
  if (tickerId !== null) {
    window.clearInterval(tickerId);
    tickerId = null;
  }
}