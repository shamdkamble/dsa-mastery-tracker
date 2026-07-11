import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { testingSubnav } from "../components/testing-shell.js";
import {
  COMPASS_META,
  COMPASS_SECTIONS,
  ACCESS_LABELS,
} from "../data/platform-compass-content.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function countPages() {
  return COMPASS_SECTIONS.reduce((sum, section) => sum + section.pages.length, 0);
}

function countElements() {
  return COMPASS_SECTIONS.reduce(
    (sum, section) => sum + section.pages.reduce((p, page) => p + page.elements.length, 0),
    0,
  );
}

function accessBadge(access) {
  const meta = ACCESS_LABELS[access] || { label: access, variant: "muted" };
  return `<span class="compass-access compass-access--${meta.variant}">${escapeHtml(meta.label)}</span>`;
}

function renderElementRow(el) {
  return `
    <div class="compass-element" data-compass-element>
      <div class="compass-element__name">${escapeHtml(el.name)}</div>
      <div class="compass-element__col">
        <span class="compass-element__label">Why it exists</span>
        <p>${escapeHtml(el.intent)}</p>
      </div>
      <div class="compass-element__col">
        <span class="compass-element__label">Expected behavior</span>
        <p>${escapeHtml(el.expected)}</p>
      </div>
    </div>
  `;
}

function renderPageCard(page, section) {
  const pageId = page.path || `global-${page.title.toLowerCase().replace(/\s+/g, "-")}`;
  const openLink = page.path
    ? `<a href="#/${page.path}" class="compass-page__open" data-route="${page.path}">
        ${icon("externalLink")}<span>Open page</span>
      </a>`
    : "";

  const workflow = page.workflow?.length
    ? `<ol class="compass-page__workflow">${page.workflow.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
    : "";

  return `
    <article
      class="compass-page"
      data-compass-page
      data-page-id="${escapeHtml(pageId)}"
      data-section-id="${section.id}"
      data-search="${escapeHtml([
        page.title,
        page.purpose,
        section.label,
        ...(page.elements || []).flatMap((el) => [el.name, el.intent, el.expected]),
      ].join(" ").toLowerCase())}"
    >
      <button type="button" class="compass-page__head" data-compass-toggle aria-expanded="false">
        <span class="compass-page__icon" aria-hidden="true">${icon(page.icon)}</span>
        <span class="compass-page__head-copy">
          <span class="compass-page__title-row">
            <span class="compass-page__title">${escapeHtml(page.title)}</span>
            ${accessBadge(page.access)}
            ${page.path ? `<code class="compass-page__route">#/${escapeHtml(page.path)}</code>` : `<span class="compass-page__route compass-page__route--global">Shared component</span>`}
          </span>
          <span class="compass-page__purpose">${escapeHtml(page.purpose)}</span>
        </span>
        <span class="compass-page__chevron" aria-hidden="true">${icon("chevronDown")}</span>
      </button>
      <div class="compass-page__body" hidden>
        <div class="compass-page__actions">
          ${openLink}
          <span class="compass-page__meta">${page.elements.length} UI elements documented</span>
        </div>
        ${workflow ? `<div class="compass-page__workflow-wrap"><span class="compass-page__section-label">Typical workflow</span>${workflow}</div>` : ""}
        <div class="compass-page__elements-head">
          <span>UI element</span>
          <span>Why it exists</span>
          <span>Expected behavior</span>
        </div>
        <div class="compass-page__elements">
          ${page.elements.map(renderElementRow).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderSection(section) {
  return `
    <section
      class="compass-section"
      id="compass-${section.id}"
      data-compass-section
      data-section-id="${section.id}"
    >
      <header class="compass-section__head">
        <div class="compass-section__icon compass-section__icon--${section.color}" aria-hidden="true">
          ${icon(section.icon)}
        </div>
        <div>
          <h2 class="compass-section__title">${escapeHtml(section.label)}</h2>
          <p class="compass-section__summary">${escapeHtml(section.summary)}</p>
        </div>
        <span class="compass-section__count">${section.pages.length} pages</span>
      </header>
      <div class="compass-section__pages">
        ${section.pages.map((page) => renderPageCard(page, section)).join("")}
      </div>
    </section>
  `;
}

function renderCompass({ query = "", activeSection = "all" }) {
  const totalPages = countPages();
  const totalElements = countElements();

  const sectionNav = `
    <nav class="compass-filter" aria-label="Filter by area">
      <button type="button" class="compass-filter__chip${activeSection === "all" ? " is-active" : ""}" data-section-filter="all">All areas</button>
      ${COMPASS_SECTIONS.map((s) => `
        <button type="button" class="compass-filter__chip compass-filter__chip--${s.color}${activeSection === s.id ? " is-active" : ""}" data-section-filter="${s.id}">
          ${icon(s.icon)}<span>${escapeHtml(s.label)}</span>
        </button>
      `).join("")}
    </nav>
  `;

  const toc = `
    <aside class="compass-toc" aria-label="On this guide">
      <div class="compass-toc__label">Jump to</div>
      ${COMPASS_SECTIONS.map((s) => `
        <a href="#compass-${s.id}" class="compass-toc__link" data-toc-link="${s.id}">${escapeHtml(s.label)}</a>
      `).join("")}
    </aside>
  `;

  return createPage({
    hideHeader: true,
    children: `
      <div class="compass-page-root" data-platform-compass>
        <header class="compass-hero">
          <div class="compass-hero__mesh" aria-hidden="true"></div>
          <div class="compass-hero__content">
            <div class="compass-hero__top">
              <span class="compass-hero__badge">${icon("layers")}<span>QA Field Guide</span></span>
              <h1 class="compass-hero__title">${escapeHtml(COMPASS_META.title)}</h1>
            </div>
            <p class="compass-hero__tagline">${escapeHtml(COMPASS_META.tagline)}</p>
            <p class="compass-hero__intro">${escapeHtml(COMPASS_META.intro)}</p>
            <div class="compass-hero__stats">
              <div class="compass-hero__stat">
                <span class="compass-hero__stat-value">${totalPages}</span>
                <span class="compass-hero__stat-label">Pages mapped</span>
              </div>
              <div class="compass-hero__stat">
                <span class="compass-hero__stat-value">${totalElements}</span>
                <span class="compass-hero__stat-label">UI elements</span>
              </div>
              <div class="compass-hero__stat">
                <span class="compass-hero__stat-value">${COMPASS_SECTIONS.length}</span>
                <span class="compass-hero__stat-label">Product zones</span>
              </div>
            </div>
          </div>
        </header>

        ${testingSubnav("compass")}

        <div class="compass-toolbar">
          <div class="compass-search">
            ${icon("search")}
            <input
              type="search"
              class="compass-search__input"
              placeholder="Search pages, buttons, cards, expected behavior…"
              value="${escapeHtml(query)}"
              data-compass-search
              aria-label="Search platform guide"
            />
          </div>
          <div class="compass-toolbar__actions">
            <button type="button" class="compass-btn" data-compass-expand-all>${icon("chevronDown")}<span>Expand all</span></button>
            <button type="button" class="compass-btn" data-compass-collapse-all>${icon("chevronLeft")}<span>Collapse all</span></button>
          </div>
        </div>

        ${sectionNav}

        <div class="compass-layout">
          ${toc}
          <div class="compass-main">
            <div class="compass-empty" data-compass-empty hidden>
              ${icon("search")}
              <h3>No matches</h3>
              <p>Try a different keyword — page names, button labels, or expected outcomes.</p>
            </div>
            ${COMPASS_SECTIONS.map(renderSection).join("")}
          </div>
        </div>
      </div>
    `,
  });
}

function normalizeQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function applyFilters(container, { query, activeSection }) {
  const q = normalizeQuery(query);
  const pages = container.querySelectorAll("[data-compass-page]");
  const sections = container.querySelectorAll("[data-compass-section]");
  let visibleCount = 0;

  pages.forEach((page) => {
    const sectionId = page.dataset.sectionId;
    const haystack = page.dataset.search || "";
    const sectionMatch = activeSection === "all" || sectionId === activeSection;
    const queryMatch = !q || haystack.includes(q);
    const visible = sectionMatch && queryMatch;
    page.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  sections.forEach((section) => {
    const sectionId = section.dataset.sectionId;
    const sectionMatch = activeSection === "all" || sectionId === activeSection;
    const hasVisible = [...section.querySelectorAll("[data-compass-page]")].some((p) => !p.hidden);
    section.hidden = !sectionMatch || !hasVisible;
  });

  const empty = container.querySelector("[data-compass-empty]");
  if (empty) empty.hidden = visibleCount > 0;
}

function setExpanded(pageEl, open) {
  const btn = pageEl.querySelector("[data-compass-toggle]");
  const body = pageEl.querySelector(".compass-page__body");
  if (!btn || !body) return;
  btn.setAttribute("aria-expanded", open ? "true" : "false");
  pageEl.classList.toggle("is-open", open);
  if (open) body.removeAttribute("hidden");
  else body.setAttribute("hidden", "");
}

function bindCompass(container) {
  const root = container.querySelector("[data-platform-compass]");
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "true";

  const state = { query: "", activeSection: "all" };

  const refresh = () => applyFilters(root, state);

  root.addEventListener("input", (e) => {
    if (!e.target.matches("[data-compass-search]")) return;
    state.query = e.target.value;
    refresh();
  });

  root.addEventListener("click", (e) => {
    const filter = e.target.closest("[data-section-filter]");
    if (filter) {
      e.preventDefault();
      state.activeSection = filter.dataset.sectionFilter;
      root.querySelectorAll("[data-section-filter]").forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.sectionFilter === state.activeSection);
      });
      refresh();
      return;
    }

    const toggle = e.target.closest("[data-compass-toggle]");
    if (toggle) {
      e.preventDefault();
      const page = toggle.closest("[data-compass-page]");
      const isOpen = page?.classList.contains("is-open");
      setExpanded(page, !isOpen);
      return;
    }

    if (e.target.closest("[data-compass-expand-all]")) {
      root.querySelectorAll("[data-compass-page]:not([hidden])").forEach((page) => setExpanded(page, true));
      return;
    }

    if (e.target.closest("[data-compass-collapse-all]")) {
      root.querySelectorAll("[data-compass-page]").forEach((page) => setExpanded(page, false));
    }
  });

  refresh();
}

export default {
  title: "Platform Compass",
  render() {
    return renderCompass({});
  },
  onMount(container) {
    bindCompass(container);
  },
};