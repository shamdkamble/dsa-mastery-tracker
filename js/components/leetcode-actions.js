/**
 * Reusable LeetCode solve / link UI
 */

import { icon } from "./icons.js";
import { buildLeetcodeUrl } from "../services/leetcode.js";

export function getProblemLeetcodeUrl(problem) {
  return problem?.leetcodeUrl || buildLeetcodeUrl(problem?.leetcodeSlug);
}

export function leetcodeLinkButton(url, { size = "sm", label = "Solve", className = "" } = {}) {
  if (!url) return "";
  return `
    <a
      href="${url}"
      class="btn btn--${size === "xs" ? "xs" : size} btn--outline leetcode-solve-btn ${className}"
      data-action="open-leetcode"
      data-url="${url}"
      target="_blank"
      rel="noopener noreferrer"
      title="Open on LeetCode"
      onclick="event.stopPropagation()"
    >
      ${icon("externalLink")}
      ${label ? `<span>${label}</span>` : ""}
    </a>
  `;
}

export function leetcodeIconLink(url) {
  if (!url) return "";
  return `
    <a
      href="${url}"
      class="leetcode-icon-link"
      data-action="open-leetcode"
      data-url="${url}"
      target="_blank"
      rel="noopener noreferrer"
      title="Open on LeetCode"
      aria-label="Open on LeetCode"
      onclick="event.stopPropagation()"
    >
      ${icon("externalLink")}
    </a>
  `;
}

export function initLeetcodeLinks(root = document) {
  root.addEventListener("click", (e) => {
    const link = e.target.closest("[data-action='open-leetcode']");
    if (link) {
      e.stopPropagation();
    }
  });
}