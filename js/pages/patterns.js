import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, ProgressBar, Alert } from "../components/ui/index.js";
import { computePatternStats } from "../storage/computed.js";
import { getProblems } from "../storage/db.js";

function patternCard(p) {
  const iconVariant = p.color !== "accent" ? ` pattern-card__icon--${p.color}` : "";
  const barVariant = p.problems === 0
    ? "default"
    : p.mastery >= 75 ? "success" : p.mastery >= 55 ? "warning" : "danger";
  const countLabel = p.problems === 0
    ? "No problems tracked yet"
    : `${p.solved} of ${p.problems} problems solved`;

  return `
    <div class="pattern-card animate-fade-in-up" data-pattern="${p.name}">
      <div class="pattern-card__icon${iconVariant}" aria-hidden="true">${icon(p.icon)}</div>
      <div class="pattern-card__name">${p.name}</div>
      <div class="pattern-card__count">${countLabel}</div>
      ${ProgressBar({ value: p.mastery, variant: barVariant, showValue: false })}
      <div class="pattern-card__mastery">
        <span>Mastery</span>
        <span>${p.problems === 0 ? "—" : `${p.mastery}%`}</span>
      </div>
    </div>
  `;
}

export default {
  title: "Patterns",
  render() {
    const patterns = computePatternStats();
    const withProblems = patterns.filter((p) => p.problems > 0);
    const avgMastery = withProblems.length
      ? Math.round(withProblems.reduce((s, p) => s + p.mastery, 0) / withProblems.length)
      : 0;
    const strong = withProblems.filter((p) => p.mastery >= 75).length;
    const weak = withProblems.filter((p) => p.mastery > 0 && p.mastery < 55).length;
    const totalProblems = getProblems().length;

    return createPage({
      title: "Patterns",
      description: "Master essential DSA patterns — mastery is computed from your tracked problems.",
      children: `
        <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div class="cluster">
            ${Badge({ label: `${patterns.length} patterns`, variant: "accent" })}
            ${totalProblems > 0 ? Badge({ label: `Avg ${avgMastery}% mastery`, variant: "default" }) : ""}
            ${strong > 0 ? Badge({ label: `${strong} strong`, variant: "success" }) : ""}
            ${weak > 0 ? Badge({ label: `${weak} needs work`, variant: "warning" }) : ""}
          </div>
          <button class="btn btn--primary btn--sm" data-action="add-problem" type="button">
            ${icon("plus")}<span>Add Problem</span>
          </button>
        </div>

        ${totalProblems === 0 ? Alert({
          variant: "info",
          title: "Start tracking patterns",
          text: "The catalog below lists every DSA pattern. Add problems and assign a pattern to each one to see mastery progress.",
          dismissible: false,
          className: "mb-6",
        }) : ""}

        <div class="patterns-grid stagger-children">${patterns.map(patternCard).join("")}</div>
      `,
    });
  },
  onMount(container) {
    import("../controllers/page-controller.js").then(({ bindPageHandlers }) => bindPageHandlers(container));
  },
};