import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, DifficultyBadge, ProgressBar, StatCard } from "../components/ui/index.js";
import { ROADMAP_PHASES } from "../data/roadmap.js";
import { bindTeachTopicHandlers } from "../components/teach-modal.js";
import { $$ } from "../utils.js";

const ROADMAP_META = {
  totalPhases: ROADMAP_PHASES.length,
  duration: "10–12 months",
  tracks: ["DSA", "C++"],
};

const PHASE_META = {
  1: {
    duration: "Months 1–2",
    icon: "database",
    accent: "accent",
    description: "Build language fluency in C++ while mastering arrays, strings, hashing, and basic problem-solving workflows.",
    focus: ["C++ syntax & STL", "Time & space complexity", "Arrays & strings", "Hash maps & sets"],
  },
  2: {
    duration: "Months 3–5",
    icon: "patterns",
    accent: "success",
    description: "Internalize the high-frequency patterns that appear across 80% of medium LeetCode interviews.",
    focus: ["Two pointers", "Sliding window", "Binary search", "BFS & DFS"],
  },
  3: {
    duration: "Months 5–7",
    icon: "zap",
    accent: "warning",
    description: "Tackle dynamic programming, greedy strategies, heaps, tries, and union-find for hard-tier problems.",
    focus: ["Dynamic programming", "Greedy", "Heaps & priority queues", "Union-find & tries"],
  },
  4: {
    duration: "Months 7–9",
    icon: "layers",
    accent: "accent",
    description: "Learn scalable architecture thinking — APIs, databases, caching, and trade-off discussions for interviews.",
    focus: ["Requirements & estimation", "High-level design", "Data modeling", "Caching & scaling"],
  },
  5: {
    duration: "Months 9–11",
    icon: "user",
    accent: "success",
    description: "Ship portfolio projects and craft STAR stories that demonstrate ownership, impact, and collaboration.",
    focus: ["Resume projects", "STAR stories", "Leadership principles", "Cross-functional impact"],
  },
  6: {
    duration: "Months 11–12",
    icon: "target",
    accent: "danger",
    description: "Simulate full loops, patch weak spots, and peak with timed contests plus company-specific prep.",
    focus: ["Mock interviews", "Weak-area drills", "Company research", "Offer negotiation"],
  },
};

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function topicTrack(topic) {
  if (topic.id?.startsWith("cpp-")) return "cpp";
  if (topic.id?.startsWith("dsa-")) return "dsa";
  return "";
}

function learnButton(topic) {
  const track = topicTrack(topic);

  return `
    <button
      class="btn btn--sm btn--primary roadmap-topic__learn"
      type="button"
      data-action="teach-topic"
      data-topic-id="${escapeAttr(topic.id)}"
      data-topic-name="${escapeAttr(topic.name)}"
      data-topic-phase="${topic.phase}"
      data-topic-difficulty="${escapeAttr(topic.difficulty)}"
      data-topic-track="${escapeAttr(track)}"
      title="Get an AI lesson on ${escapeAttr(topic.name)}"
    >
      ${icon("zap")}
      <span>Learn</span>
    </button>
  `;
}

function topicCard(topic) {
  const track = topicTrack(topic);
  const trackLabel = track === "cpp" ? "C++" : track === "dsa" ? "DSA" : "Topic";
  const trackClass = track ? `roadmap-topic--${track}` : "roadmap-topic--general";

  return `
    <div class="roadmap-topic ${trackClass}">
      <div class="roadmap-topic__head">
        <span class="roadmap-topic__track">${trackLabel}</span>
        ${DifficultyBadge(topic.difficulty)}
      </div>
      <h4 class="roadmap-topic__title">${topic.name}</h4>
      <div class="roadmap-topic__footer">
        ${learnButton(topic)}
      </div>
    </div>
  `;
}

function buildPhase1Steps(topics) {
  const steps = [];
  for (let i = 0; i < topics.length; i += 2) {
    const step = i / 2 + 1;
    steps.push({
      step,
      label: `Week ${Math.ceil(step / 2)}`,
      cpp: topics[i],
      dsa: topics[i + 1],
    });
  }
  return steps;
}

function phase1StepRow(entry) {
  return `
    <div class="roadmap-step" data-step="${entry.step}">
      <div class="roadmap-step__header">
        <span class="roadmap-step__num">Step ${entry.step}</span>
        ${Badge({ label: entry.label, variant: "default", size: "sm" })}
      </div>
      <div class="roadmap-step__grid">
        ${topicCard(entry.cpp)}
        <div class="roadmap-step__bridge" aria-hidden="true">
          <span class="roadmap-step__bridge-line"></span>
          <span class="roadmap-step__bridge-icon">${icon("gitBranch")}</span>
          <span class="roadmap-step__bridge-line"></span>
        </div>
        ${topicCard(entry.dsa)}
      </div>
    </div>
  `;
}

function renderPhase1Content(phase) {
  const steps = buildPhase1Steps(phase.topics);

  return `
    <div class="roadmap-phase__focus">
      <span class="roadmap-phase__focus-label">Key focus</span>
      <div class="roadmap-phase__focus-tags cluster">
        ${PHASE_META[1].focus.map((f) => Badge({ label: f, variant: "accent", size: "sm" })).join("")}
      </div>
    </div>

    <div class="roadmap-parallel">
      <div class="roadmap-parallel__intro">
        <div class="roadmap-parallel__intro-text">
          <h4 class="roadmap-parallel__title">Parallel learning path</h4>
          <p class="roadmap-parallel__desc">
            ${steps.length} steps · ${phase.topics.length} topics — each step pairs one C++ concept with a matching DSA topic. Click <strong>Learn</strong> for an AI-generated lesson.
          </p>
        </div>
        <div class="roadmap-parallel__legend cluster">
          ${Badge({ label: "C++", variant: "accent", size: "sm" })}
          ${Badge({ label: "DSA", variant: "success", size: "sm" })}
        </div>
      </div>

      <div class="roadmap-step-list">
        ${steps.map(phase1StepRow).join("")}
      </div>
    </div>
  `;
}

function renderPhaseTopicsGrid(phase) {
  const meta = PHASE_META[phase.id];

  return `
    <div class="roadmap-phase__focus">
      <span class="roadmap-phase__focus-label">Key focus</span>
      <div class="roadmap-phase__focus-tags cluster">
        ${meta.focus.map((f) => Badge({ label: f, variant: "accent", size: "sm" })).join("")}
      </div>
    </div>

    <div class="roadmap-topics-grid">
      ${phase.topics.map(topicCard).join("")}
    </div>
  `;
}

function phaseSection(phaseData, { isOpen = false } = {}) {
  const meta = PHASE_META[phaseData.id];
  const panelId = `roadmap-phase-panel-${phaseData.id}`;
  const progress = 0;
  const panelContent = phaseData.id === 1
    ? renderPhase1Content(phaseData)
    : renderPhaseTopicsGrid(phaseData);

  return `
    <article
      class="roadmap-phase roadmap-phase--${meta.accent}${isOpen ? " is-open" : ""}"
      data-phase="${phaseData.id}"
    >
      <button
        class="roadmap-phase__toggle"
        type="button"
        aria-expanded="${isOpen}"
        aria-controls="${panelId}"
        id="roadmap-phase-trigger-${phaseData.id}"
      >
        <div class="roadmap-phase__rail" aria-hidden="true">
          <div class="roadmap-phase__indicator">
            <span class="roadmap-phase__indicator-icon">${icon(meta.icon)}</span>
            <span class="roadmap-phase__indicator-num">${phaseData.id}</span>
          </div>
        </div>

        <div class="roadmap-phase__summary">
          <div class="roadmap-phase__meta">
            <span class="roadmap-phase__eyebrow">Phase ${phaseData.id}</span>
            ${Badge({ label: meta.duration, variant: "default", size: "sm" })}
            ${Badge({ label: "0% complete", variant: "default", size: "sm" })}
            ${Badge({ label: `${phaseData.topics.length} topics`, variant: "accent", size: "sm" })}
          </div>
          <h3 class="roadmap-phase__title">${phaseData.title}</h3>
          <p class="roadmap-phase__desc">${meta.description}</p>
          ${ProgressBar({
            value: progress,
            showValue: false,
            className: "roadmap-phase__progress",
          })}
        </div>

        <span class="roadmap-phase__chevron" aria-hidden="true">${icon("chevronDown")}</span>
      </button>

      <div
        class="roadmap-phase__panel"
        id="${panelId}"
        role="region"
        aria-labelledby="roadmap-phase-trigger-${phaseData.id}"
        aria-hidden="${!isOpen}"
      >
        <div class="roadmap-phase__content">
          ${panelContent}
        </div>
      </div>
    </article>
  `;
}

function bindPhaseAccordion(container) {
  const phases = $$(".roadmap-phase", container);

  phases.forEach((phaseEl) => {
    const toggle = phaseEl.querySelector(".roadmap-phase__toggle");
    const panel = phaseEl.querySelector(".roadmap-phase__panel");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const willOpen = !phaseEl.classList.contains("is-open");

      phaseEl.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));
      panel.setAttribute("aria-hidden", String(!willOpen));
    });
  });
}

export default {
  title: "FAANG Mastery Roadmap",
  render() {
    const overallProgress = 0;
    const completedPhases = 0;
    const totalTopics = ROADMAP_PHASES.reduce((sum, p) => sum + p.topics.length, 0);

    return createPage({
      title: "FAANG Mastery Roadmap",
      description:
        "A structured 10–12 month path to FAANG-level DSA mastery — with parallel C++ fundamentals and curated LeetCode problems.",
      children: `
        <div class="roadmap-header animate-fade-in-up">
          <div class="roadmap-header__top">
            <div class="roadmap-header__badges cluster">
              ${Badge({ label: ROADMAP_META.duration, variant: "accent" })}
              ${ROADMAP_META.tracks.map((t) => Badge({ label: t, variant: "default" })).join("")}
              ${Badge({ label: `${ROADMAP_META.totalPhases} phases`, variant: "default" })}
              ${Badge({ label: `${totalTopics} topics`, variant: "default" })}
            </div>
            <div class="roadmap-header__summary">
              <span class="roadmap-header__summary-value">${completedPhases}</span>
              <span class="roadmap-header__summary-label">of ${ROADMAP_META.totalPhases} phases complete</span>
            </div>
          </div>
          ${ProgressBar({
            label: "Overall Progress",
            value: overallProgress,
            size: "lg",
            className: "roadmap-header__progress",
          })}
        </div>

        <div class="roadmap-stats stagger-children">
          ${StatCard({
            label: "Phases",
            value: String(ROADMAP_META.totalPhases),
            icon: icon("layers"),
          })}
          ${StatCard({
            label: "Topics",
            value: String(totalTopics),
            icon: icon("topics"),
          })}
          ${StatCard({
            label: "Duration",
            value: ROADMAP_META.duration,
            icon: icon("clock"),
          })}
          ${StatCard({
            label: "Tracks",
            value: String(ROADMAP_META.tracks.length),
            icon: icon("gitBranch"),
          })}
        </div>

        <section class="page-section roadmap-phases" aria-label="Learning phases">
          <div class="page-section__header">
            <h2 class="page-section__title">Learning Phases</h2>
            <span class="text-sm text-tertiary">Expand a phase and click <strong>Learn</strong> for an AI lesson</span>
          </div>
          <div class="roadmap-phase-list" id="roadmap-phases" data-roadmap-accordion>
            ${ROADMAP_PHASES.map((phase, i) => phaseSection(phase, { isOpen: i === 0 })).join("")}
          </div>
        </section>
      `,
    });
  },
  onMount(container) {
    bindPhaseAccordion(container);
    bindTeachTopicHandlers(container);
  },
};