import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, DifficultyBadge, ProgressBar, StatCard } from "../components/ui/index.js";
import { ROADMAP_PHASES, ROADMAP_TOPICS } from "../data/roadmap.js";
import { bindTeachTopicHandlers } from "../components/teach-modal.js";
import { openUpgradeModal } from "../components/upgrade-modal.js";
import {
  countCompletedInPhase,
  isTopicCompleted,
} from "../storage/roadmap-progress.js";
import { refreshPage } from "../controllers/page-controller.js";
import { getCurrentPath, getHashSearchParams } from "../router.js";
import { openTeachLesson } from "../components/teach-modal.js";
import { loadRoadmapProgress } from "../storage/roadmap-progress.js";
import { renderAiLockBadge } from "../components/access-ui.js";
import { getTierBannerClass } from "../subscription-theme.js";
import {
  canAccessAiGeneration,
  canAccessPhase,
  canAccessRoadmapStep,
  canOpenLesson,
  getRoadmapAccessHint,
  hasFullRoadmapAccess,
  hasStandardAccess,
  hasTrialAccess,
} from "../auth/access.js";
import { getSessionUser } from "../auth/session.js";
import {
  getTopicRecommendationSummary,
  openTopicRecommendations,
} from "../services/topic-recommendations.js";
import {
  renderPageSearch,
  bindPageSearchInput,
  normalizeSearchQuery,
} from "../utils/page-search.js";

const ROADMAP_META = {
  totalPhases: ROADMAP_PHASES.length,
  duration: "10–12 months",
  tracks: ["DSA", "C++"],
};

/** Persisted across page refreshes so accordion state survives progress reloads. */
const openPhaseIds = new Set([1]);

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

function learnButton(topic, { locked = false, aiGenerationLocked = false, step } = {}) {
  const track = topicTrack(topic);

  if (locked) {
    return `
      <button
        class="btn btn--sm btn--ghost roadmap-topic__learn roadmap-topic__learn--locked"
        type="button"
        data-action="upgrade"
        data-roadmap-locked
        title="Subscribe to unlock this topic"
      >
        ${icon("lock")}
        <span>Learn</span>
      </button>
    `;
  }

  const completed = isTopicCompleted(topic.id);
  const aiTitle = aiGenerationLocked
    ? "View topic — AI lesson generation requires Premium"
    : `Get an AI lesson on ${topic.name}`;

  if (aiGenerationLocked) {
    return `
      <button
        class="btn btn--sm btn--secondary roadmap-topic__learn roadmap-topic__learn--ai-locked"
        type="button"
        data-action="teach-topic"
        data-topic-id="${escapeAttr(topic.id)}"
        data-topic-name="${escapeAttr(topic.name)}"
        data-topic-phase="${topic.phase}"
        data-topic-step="${step ?? ""}"
        data-topic-difficulty="${escapeAttr(topic.difficulty)}"
        data-topic-track="${escapeAttr(track)}"
        title="${escapeAttr(aiTitle)}"
      >
        ${icon(completed ? "check" : "topics")}
        <span>${completed ? "Review" : "Learn"}</span>
        ${renderAiLockBadge()}
      </button>
    `;
  }

  return `
    <button
      class="btn btn--sm btn--primary roadmap-topic__learn${completed ? " is-completed" : ""}"
      type="button"
      data-action="teach-topic"
      data-topic-id="${escapeAttr(topic.id)}"
      data-topic-name="${escapeAttr(topic.name)}"
      data-topic-phase="${topic.phase}"
      data-topic-step="${step ?? ""}"
      data-topic-difficulty="${escapeAttr(topic.difficulty)}"
      data-topic-track="${escapeAttr(track)}"
      title="${escapeAttr(aiTitle)}"
    >
      ${icon(completed ? "check" : "zap")}
      <span>${completed ? "Review" : "Learn"}</span>
    </button>
  `;
}

function lockBadge() {
  return `<span class="roadmap-lock-badge" title="Subscribe to unlock">${icon("lock")}<span>Locked</span></span>`;
}

function renderTierBanner(user) {
  if (hasFullRoadmapAccess(user)) return "";

  let title = "Free plan";
  let text = "You have access to 2 preview topics in Phase 1. Upgrade for the full roadmap and AI tools.";
  let context = "standard";

  if (hasTrialAccess(user)) {
    const hint = getRoadmapAccessHint(user);
    title = "Trial plan";
    text = `${hint}. All Phase 1 lessons are unlocked — "Explain in Simpler Words" is locked from Step 3 onward.`;
    context = "trial";
  } else if (hasStandardAccess(user)) {
    title = "Free plan";
    text = "Step 1 includes 2 topics with AI lessons. Upgrade to unlock all phases and AI problem helpers.";
    context = "standard";
  }

  return `
    <div class="roadmap-tier-banner ${getTierBannerClass(user)} animate-fade-in-up">
      <div class="roadmap-tier-banner__icon" aria-hidden="true">${icon(hasTrialAccess(user) ? "clock" : "lock")}</div>
      <div class="roadmap-tier-banner__body">
        <p class="roadmap-tier-banner__title">${title}</p>
        <p class="roadmap-tier-banner__text">${text}</p>
      </div>
      <button type="button" class="btn btn--primary btn--sm roadmap-tier-banner__cta" data-action="upgrade-tier" data-upgrade-context="${context}">
        ${icon("zap")}
        <span>Upgrade</span>
      </button>
    </div>
  `;
}

function practiceProblemsButton(topic) {
  if (!isTopicCompleted(topic.id)) return "";
  const { pending } = getTopicRecommendationSummary(topic.id);
  if (!pending) return "";

  return `
    <button
      type="button"
      class="btn btn--sm btn--outline roadmap-topic__practice"
      data-action="topic-practice"
      data-topic-id="${escapeAttr(topic.id)}"
      data-topic-name="${escapeAttr(topic.name)}"
      title="Add remaining curated practice problems"
    >
      ${icon("plus")}
      <span>${pending} left</span>
    </button>
  `;
}

function topicCard(topic, { locked = false, aiGenerationLocked = false, step } = {}) {
  const track = topicTrack(topic);
  const trackLabel = track === "cpp" ? "C++" : track === "dsa" ? "DSA" : "Topic";
  const trackClass = track ? `roadmap-topic--${track}` : "roadmap-topic--general";

  return `
    <div
      class="roadmap-topic ${trackClass}${locked ? " roadmap-topic--locked" : ""}"
      data-roadmap-topic-search="${escapeAttr(topic.name.toLowerCase())}"
      ${locked ? 'data-roadmap-locked tabindex="0" role="button" aria-label="Locked — subscribe to unlock"' : ""}
    >
      ${locked ? `<div class="roadmap-topic__lock-overlay" aria-hidden="true">${icon("lock")}</div>` : ""}
      <div class="roadmap-topic__head">
        <span class="roadmap-topic__track">${trackLabel}</span>
        ${locked ? lockBadge() : DifficultyBadge(topic.difficulty)}
      </div>
      <h4 class="roadmap-topic__title">
        ${topic.name}
        ${isTopicCompleted(topic.id) ? `<span class="roadmap-topic__done" title="Completed">${icon("check")}</span>` : ""}
      </h4>
      <div class="roadmap-topic__footer">
        ${practiceProblemsButton(topic)}
        ${learnButton(topic, { locked, aiGenerationLocked, step })}
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

function phase1StepRow(entry, user) {
  const stepLocked = !canAccessRoadmapStep(user, 1, entry.step);
  const showLearnAiLock = !hasTrialAccess(user);
  const cppAiLocked = showLearnAiLock && !stepLocked && canOpenLesson(user, entry.cpp) && !canAccessAiGeneration(user, entry.cpp);
  const dsaAiLocked = showLearnAiLock && !stepLocked && canOpenLesson(user, entry.dsa) && !canAccessAiGeneration(user, entry.dsa);

  return `
    <div
      class="roadmap-step${stepLocked ? " roadmap-step--locked" : ""}"
      data-step="${entry.step}"
      ${stepLocked ? 'data-roadmap-locked tabindex="0" role="button" aria-label="Locked step — subscribe to unlock"' : ""}
    >
      <div class="roadmap-step__header">
        <span class="roadmap-step__num">Step ${entry.step}</span>
        ${Badge({ label: entry.label, variant: "default", size: "sm" })}
        ${stepLocked ? lockBadge() : ""}
      </div>
      <div class="roadmap-step__grid">
        ${topicCard(entry.cpp, { locked: stepLocked, aiGenerationLocked: cppAiLocked, step: entry.step })}
        <div class="roadmap-step__bridge" aria-hidden="true">
          <span class="roadmap-step__bridge-line"></span>
          <span class="roadmap-step__bridge-icon">${stepLocked ? icon("lock") : icon("gitBranch")}</span>
          <span class="roadmap-step__bridge-line"></span>
        </div>
        ${topicCard(entry.dsa, { locked: stepLocked, aiGenerationLocked: dsaAiLocked, step: entry.step })}
      </div>
    </div>
  `;
}

function renderPhase1Content(phase, user) {
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
        ${steps.map((entry) => phase1StepRow(entry, user)).join("")}
      </div>
    </div>
  `;
}

function renderPhaseTopicsGrid(phase, user) {
  const meta = PHASE_META[phase.id];
  const locked = !canAccessPhase(user, phase.id);

  return `
    <div class="roadmap-phase__focus">
      <span class="roadmap-phase__focus-label">Key focus</span>
      <div class="roadmap-phase__focus-tags cluster">
        ${meta.focus.map((f) => Badge({ label: f, variant: "accent", size: "sm" })).join("")}
      </div>
    </div>

    <div class="roadmap-topics-grid">
      ${phase.topics.map((topic) => topicCard(topic, { locked })).join("")}
    </div>
  `;
}

function phaseSection(phaseData, user, { isOpen = false } = {}) {
  const meta = PHASE_META[phaseData.id];
  const panelId = `roadmap-phase-panel-${phaseData.id}`;
  const completedInPhase = countCompletedInPhase(phaseData.id, phaseData.topics);
  const progress = phaseData.topics.length
    ? Math.round((completedInPhase / phaseData.topics.length) * 100)
    : 0;
  const phaseLocked = !canAccessPhase(user, phaseData.id);
  const panelContent = phaseData.id === 1
    ? renderPhase1Content(phaseData, user)
    : renderPhaseTopicsGrid(phaseData, user);

  return `
    <article
      class="roadmap-phase roadmap-phase--${meta.accent}${isOpen ? " is-open" : ""}${phaseLocked && phaseData.id !== 1 ? " roadmap-phase--locked" : ""}"
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
            ${Badge({ label: `${progress}% complete`, variant: progress === 100 ? "success" : "default", size: "sm" })}
            ${Badge({ label: `${phaseData.topics.length} topics`, variant: "accent", size: "sm" })}
            ${phaseLocked && phaseData.id !== 1 ? lockBadge() : ""}
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

function expandRoadmapPhase(container, phaseId) {
  const phaseEl = container.querySelector(`.roadmap-phase[data-phase="${phaseId}"]`);
  if (!phaseEl) return;

  openPhaseIds.add(phaseId);
  phaseEl.classList.add("is-open");

  const toggle = phaseEl.querySelector(".roadmap-phase__toggle");
  const panel = phaseEl.querySelector(".roadmap-phase__panel");
  toggle?.setAttribute("aria-expanded", "true");
  panel?.setAttribute("aria-hidden", "false");
}

async function tryOpenTopicFromHash(container) {
  const topicId = getHashSearchParams().get("open");
  if (!topicId) return;

  const topic = ROADMAP_TOPICS.find((t) => t.id === topicId);
  if (!topic) return;

  await loadRoadmapProgress();
  expandRoadmapPhase(container, topic.phase);

  const card = container.querySelector(`[data-topic-id="${topicId}"]`);
  card?.scrollIntoView({ behavior: "smooth", block: "center" });

  window.requestAnimationFrame(() => {
    void openTeachLesson(topic);
  });
}

function bindPhaseAccordion(container) {
  if (container.dataset.roadmapAccordionBound === "true") return;
  container.dataset.roadmapAccordionBound = "true";

  container.addEventListener("click", (e) => {
    const toggle = e.target.closest(".roadmap-phase__toggle");
    if (!toggle) return;

    const phaseEl = toggle.closest(".roadmap-phase");
    if (!phaseEl) return;

    e.preventDefault();

    if (phaseEl.classList.contains("roadmap-phase--locked")) {
      openUpgradeModal(hasTrialAccess(getSessionUser()) ? "trial" : "content");
      return;
    }

    const phaseId = Number(phaseEl.dataset.phase);
    const panel = phaseEl.querySelector(".roadmap-phase__panel");
    const willOpen = !phaseEl.classList.contains("is-open");

    phaseEl.classList.toggle("is-open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
    panel?.setAttribute("aria-hidden", String(!willOpen));

    if (willOpen) openPhaseIds.add(phaseId);
    else openPhaseIds.delete(phaseId);
  });
}

function bindTopicPracticeHandlers(container) {
  if (!container || container.dataset.topicPracticeBound) return;
  container.dataset.topicPracticeBound = "true";

  container.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="topic-practice"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    void openTopicRecommendations({
      topicId: btn.dataset.topicId,
      topicName: btn.dataset.topicName,
    }).then(() => refreshPage());
  });
}

function bindLockedContentHandlers(container) {
  if (container.dataset.roadmapLockedBound === "true") return;
  container.dataset.roadmapLockedBound = "true";

  container.addEventListener("click", (e) => {
    if (e.target.closest(".roadmap-phase__toggle")) return;

    const tierUpgradeBtn = e.target.closest('[data-action="upgrade-tier"]');
    if (tierUpgradeBtn) {
      e.preventDefault();
      e.stopPropagation();
      openUpgradeModal(tierUpgradeBtn.dataset.upgradeContext || "auto");
      return;
    }

    const upgradeBtn = e.target.closest('[data-action="upgrade"]');
    if (upgradeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const user = getSessionUser();
      openUpgradeModal(hasTrialAccess(user) ? "trial" : "standard");
      return;
    }

    const locked = e.target.closest("[data-roadmap-locked]");
    if (!locked) return;

    if (e.target.closest('[data-action="teach-topic"]')) return;

    e.preventDefault();
    e.stopPropagation();
    const user = getSessionUser();
    openUpgradeModal(hasTrialAccess(user) ? "trial" : "standard");
  });

  container.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target.closest(".roadmap-phase__toggle")) return;

    const locked = e.target.closest("[data-roadmap-locked]");
    if (!locked || e.target.closest('[data-action="teach-topic"]')) return;
    e.preventDefault();
    const user = getSessionUser();
    openUpgradeModal(hasTrialAccess(user) ? "trial" : "standard");
  });
}

export default {
  title: "FAANG Mastery Roadmap",
  render() {
    const user = getSessionUser();
    const totalTopics = ROADMAP_TOPICS.length;
    const completedTopics = ROADMAP_TOPICS.filter((t) => isTopicCompleted(t.id)).length;
    const overallProgress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const completedPhases = ROADMAP_PHASES.filter(
      (p) => countCompletedInPhase(p.id, p.topics) === p.topics.length,
    ).length;
    const accessHint = getRoadmapAccessHint(user);

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
            <span class="text-sm text-tertiary">
              Expand a phase and click <strong>Learn</strong> for an AI lesson
              ${hasFullRoadmapAccess(user) ? "" : ` · <span class="roadmap-access-hint">${accessHint}</span>`}
            </span>
          </div>
          <div class="roadmap-search-wrap">
            ${renderPageSearch({
              id: "roadmap-search",
              placeholder: "Search topics…",
              tourAttr: "page-search",
            })}
          </div>
          ${renderTierBanner(user)}
          <div class="roadmap-phase-list" id="roadmap-phases" data-roadmap-accordion>
            ${ROADMAP_PHASES.map((phase) => phaseSection(phase, user, { isOpen: openPhaseIds.has(phase.id) })).join("")}
          </div>
        </section>
      `,
    });
  },
  onMount(container) {
    bindPhaseAccordion(container);
    bindLockedContentHandlers(container);
    bindTeachTopicHandlers(container);
    bindTopicPracticeHandlers(container);
    mountRoadmapTopicSearch(container);
    void tryOpenTopicFromHash(container);

    if (!container.dataset.roadmapProgressBound) {
      container.dataset.roadmapProgressBound = "true";
      document.addEventListener("roadmap:progress", () => {
        if (getCurrentPath() === "roadmap") refreshPage();
      });
    }
  },
};

function applyRoadmapTopicSearch(container, query) {
  const q = normalizeSearchQuery(query);
  const topics = container.querySelectorAll("[data-roadmap-topic-search]");

  topics.forEach((topic) => {
    const haystack = topic.dataset.roadmapTopicSearch || "";
    topic.hidden = Boolean(q && !haystack.includes(q));
  });

  container.querySelectorAll(".roadmap-step").forEach((step) => {
    const hasVisible = [...step.querySelectorAll("[data-roadmap-topic-search]")].some((t) => !t.hidden);
    step.hidden = Boolean(q && !hasVisible);
  });

  container.querySelectorAll(".roadmap-phase").forEach((phase) => {
    const hasVisible = [...phase.querySelectorAll("[data-roadmap-topic-search]")].some((t) => !t.hidden);
    phase.hidden = Boolean(q && !hasVisible);

    if (q && hasVisible) {
      const phaseId = Number(phase.dataset.phase);
      if (phaseId) openPhaseIds.add(phaseId);
      phase.classList.add("is-open");
      phase.querySelector(".roadmap-phase__toggle")?.setAttribute("aria-expanded", "true");
      phase.querySelector(".roadmap-phase__panel")?.setAttribute("aria-hidden", "false");
    }
  });
}

function mountRoadmapTopicSearch(container) {
  const input = container.querySelector("#roadmap-search");
  if (!input) return;
  bindPageSearchInput(input, (value) => applyRoadmapTopicSearch(container, value));
  applyRoadmapTopicSearch(container, input.value);
}