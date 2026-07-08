import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, DifficultyBadge, EmptyState } from "../components/ui/index.js";
import { getSearchRecent } from "../storage/db.js";
import { searchAll } from "../storage/computed.js";
import { getState } from "../state.js";
import { bindPageHandlers } from "../controllers/page-controller.js";

function searchResultItem(item, type) {
  const iconName = type === "problems" ? "problems" : type === "patterns" ? "patterns" : "notes";
  return `
    <div class="search-result" data-action="${type === "problems" ? "edit-problem" : ""}" ${item.id ? `data-id="${item.id}"` : ""}>
      <div class="search-result__icon" aria-hidden="true">${icon(iconName)}</div>
      <div class="search-result__body">
        <div class="search-result__title">${item.title}</div>
        <div class="search-result__meta">
          ${type === "problems" ? `${item.topic || ""} · ` : ""}
          ${type === "patterns" ? `${item.count} problems` : ""}
          ${type === "notes" ? `${item.problem} · ${item.date}` : ""}
        </div>
      </div>
      ${type === "problems" ? DifficultyBadge(item.difficulty) : ""}
      ${type === "problems" && item.status === "mastered" ? Badge({ label: "Mastered", variant: "success", size: "sm" }) : ""}
    </div>
  `;
}

export function renderResults(results, query) {
  const total = results.problems.length + results.patterns.length + results.notes.length;

  if (!query?.trim()) {
    return EmptyState({
      title: "Start typing to search",
      text: "Search across problems, patterns, and notes in your workspace.",
      iconName: "search",
      compact: true,
      flat: true,
    });
  }

  if (!total) {
    return EmptyState({
      title: "No results found",
      text: `Nothing matched "${query}". Try a different term.`,
      iconName: "search",
      compact: true,
      flat: true,
    });
  }

  return `
    ${results.problems.length ? `
      <div class="search-results__group">
        <h2 class="search-results__heading">Problems · ${results.problems.length} results</h2>
        ${results.problems.map((p) => searchResultItem(p, "problems")).join("")}
      </div>
    ` : ""}
    ${results.patterns.length ? `
      <div class="search-results__group">
        <h2 class="search-results__heading">Patterns · ${results.patterns.length} results</h2>
        ${results.patterns.map((p) => searchResultItem(p, "patterns")).join("")}
      </div>
    ` : ""}
    ${results.notes.length ? `
      <div class="search-results__group">
        <h2 class="search-results__heading">Notes · ${results.notes.length} results</h2>
        ${results.notes.map((n) => searchResultItem(n, "notes")).join("")}
      </div>
    ` : ""}
  `;
}

export default {
  title: "Search",
  render() {
    const recent = getSearchRecent();
    const query = getState().searchQuery || "";
    const results = searchAll(query);

    return createPage({
      title: "",
      hideHeader: true,
      children: `
        <div class="search-page">
          <div class="search-hero">
            <h1 class="page-greeting__title mb-2">Search</h1>
            <p class="page-greeting__subtitle mb-6">Find problems, patterns, notes, and topics across your workspace.</p>
            <div class="search-hero__input-wrap">
              <span class="search-icon" aria-hidden="true">${icon("search")}</span>
              <input
                type="search"
                class="search-hero__input"
                id="search-page-input"
                placeholder="Search problems, patterns, notes..."
                value="${query}"
                aria-label="Search"
              />
            </div>
            ${recent.length ? `
              <div class="search-recent">
                <span class="search-recent__label">Recent:</span>
                ${recent.map((q) => `<button class="chip" data-recent-search="${q}" type="button">${q}</button>`).join("")}
              </div>
            ` : ""}
          </div>

          <div class="search-results" id="search-results">
            ${renderResults(results, query)}
          </div>
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
  },
};