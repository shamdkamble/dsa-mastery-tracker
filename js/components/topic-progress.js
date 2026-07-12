/**
 * Shared Topic Performance / Topic Mastery progress UI.
 */

import { ProgressBar, EmptyState } from "./ui/index.js";

export function topicProgressVariant(percent) {
  if (percent >= 80) return "success";
  if (percent >= 65) return "warning";
  return "danger";
}

export function renderTopicProgressBars(topics, { showCounts = true, showValue = false } = {}) {
  return topics.map((t) => ProgressBar({
    label: showCounts ? `${t.name} (${t.solved}/${t.total})` : t.name,
    value: t.percent,
    variant: topicProgressVariant(t.percent),
    showValue,
  })).join("");
}

export function renderTopicPerformanceSection(topics, {
  meaningful,
  uncategorized,
} = {}) {
  const displayTopics = meaningful
    ? topics.filter((t) => !t.isUncategorized)
    : topics;
  const labeledCount = displayTopics.length;

  if (!meaningful) {
    const uncategorizedNote = uncategorized?.total
      ? ` ${uncategorized.total} problem${uncategorized.total !== 1 ? "s" : ""} still need a topic — edit them or add from the roadmap.`
      : "";

    return `
      <section class="page-section">
        <div class="page-section__header">
          <h2 class="page-section__title">Topic Performance</h2>
        </div>
        ${EmptyState({
          title: "No topic labels yet",
          text: `Add problems from the FAANG Roadmap or import LeetCode URLs so topics are detected automatically.${uncategorizedNote}`,
          iconName: "topics",
          compact: true,
          flat: true,
          actions: `
            <a href="#/roadmap" class="btn btn--secondary btn--sm">Browse Roadmap</a>
            <button class="btn btn--primary btn--sm" data-action="add-problem" type="button">Add Problem</button>
          `,
        })}
      </section>
    `;
  }

  return `
    <section class="page-section">
      <div class="page-section__header">
        <h2 class="page-section__title">Topic Performance</h2>
        <span class="text-sm text-tertiary">Weak areas first · ${labeledCount} topic${labeledCount !== 1 ? "s" : ""}</span>
      </div>
      <div class="stack stack-md">
        ${renderTopicProgressBars(displayTopics)}
      </div>
      ${uncategorized?.total ? `
        <p class="text-sm text-tertiary mt-4">
          ${uncategorized.total} problem${uncategorized.total !== 1 ? "s" : ""} without a topic
          ${uncategorized.solved ? `(${uncategorized.solved} done)` : ""}
          — edit them to include in this breakdown.
        </p>
      ` : ""}
    </section>
  `;
}