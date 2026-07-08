/**
 * Theme manager — session storage only (resets on tab close)
 */

const THEME_KEY = "dsa-theme";
const THEMES = ["light", "dark"];

let currentTheme = getStoredTheme() || getSystemTheme();

function getStoredTheme() {
  try {
    const stored = sessionStorage.getItem(THEME_KEY);
    return THEMES.includes(stored) ? stored : null;
  } catch (e) {
    return null;
  }
}

function getSystemTheme() {
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  currentTheme = theme;
  try {
    sessionStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* sessionStorage unavailable */
  }
}

export function getTheme() {
  return currentTheme;
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  applyTheme(theme);
}

export function toggleTheme() {
  const next = currentTheme === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}

export function initTheme() {
  applyTheme(currentTheme);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!getStoredTheme()) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}