/**
 * Per-page search field — local filter only (no global search).
 */

import { icon } from "../components/icons.js";

export function normalizeSearchQuery(value) {
  return String(value || "").trim().toLowerCase();
}

export function renderPageSearch({ id, placeholder = "Search…", tourAttr = "" }) {
  const tour = tourAttr ? ` data-tour="${tourAttr}"` : "";
  return `
    <div class="page-search"${tour}>
      <span class="page-search__icon" aria-hidden="true">${icon("search")}</span>
      <input
        type="search"
        class="input page-search__input"
        id="${id}"
        placeholder="${placeholder}"
        autocomplete="off"
        aria-label="Search"
      />
    </div>
  `;
}

/** Binds input/search events; safe to call again after page re-render (replaces prior listeners). */
export function bindPageSearchInput(input, onSearch) {
  if (!input) return;
  if (input._pageSearchAbort) input._pageSearchAbort.abort();

  const ac = new AbortController();
  input._pageSearchAbort = ac;

  const run = () => onSearch(input.value);
  input.addEventListener("input", run, { signal: ac.signal });
  input.addEventListener("search", run, { signal: ac.signal });
}