/**
 * Reusable LeetCode solve / link UI + wall-clock solve timer
 */

import { icon } from "./icons.js";
import { buildLeetcodeUrl, openLeetcode } from "../services/leetcode.js";
import { getProblem, startProblemSolve } from "../storage/db.js";
import { showToast, Toast } from "./ui/index.js";
import { refreshPage } from "../controllers/page-controller.js";

export function getProblemLeetcodeUrl(problem) {
  return problem?.leetcodeUrl || buildLeetcodeUrl(problem?.leetcodeSlug);
}

export function leetcodeLinkButton(url, options = {}) {
  const {
    size = "sm",
    label = "Solve",
    className = "",
    problemId = "",
  } = options;

  if (!url) return "";

  const action = problemId ? "start-solve" : "open-leetcode";
  const problemAttr = problemId ? ` data-problem-id="${problemId}"` : "";

  return `
    <a
      href="${url}"
      class="btn btn--${size === "xs" ? "xs" : size} btn--outline leetcode-solve-btn ${className}"
      data-action="${action}"
      data-url="${url}"${problemAttr}
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

export function leetcodeIconLink(url, problemId = "") {
  if (!url) return "";
  const action = problemId ? "start-solve" : "open-leetcode";
  const problemAttr = problemId ? ` data-problem-id="${problemId}"` : "";

  return `
    <a
      href="${url}"
      class="leetcode-icon-link"
      data-action="${action}"
      data-url="${url}"${problemAttr}
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

let solveHandlersBound = false;

export function initLeetcodeLinks(root = document) {
  if (solveHandlersBound) return;
  solveHandlersBound = true;

  root.addEventListener("click", (e) => {
    const link = e.target.closest("[data-action='open-leetcode'], [data-action='start-solve']");
    if (!link) return;

    e.stopPropagation();

    if (link.dataset.action === "start-solve" && link.dataset.problemId) {
      e.preventDefault();
      const { problemId, url } = link.dataset;
      const existing = getProblem(problemId);
      const wasRunning = Boolean(existing?.startedAt && existing.status !== "mastered");
      void startProblemSolve(problemId)
        .then(() => {
          openLeetcode(url);
          if (!wasRunning) {
            showToast(Toast({
              title: "Timer started",
              text: "Mark done when you return to record your time.",
              variant: "info",
            }));
          }
          refreshPage();
        })
        .catch((err) => {
          console.error("[solve-timer]", err);
          openLeetcode(url);
        });
    }
  });
}