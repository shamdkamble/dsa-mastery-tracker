/**
 * Shared page interaction handlers
 */

import { $, $$ } from "../utils.js";
import {
  toggleMissionDone,
  addToMission,
  markProblemSolved,
  updateUser,
  updateSettings,
  updateNotificationSetting,
  exportData,
  importData,
  clearAllData,
  addSearchRecent,
} from "../storage/db.js";
import { navigate, getCurrentPath, renderRoute } from "../router.js";
import { openProblemModal } from "../components/problem-modal.js";
import { showToast, Toast } from "../components/ui/index.js";
import { getTheme, setTheme, toggleTheme } from "../theme.js";
import { setState } from "../state.js";
import { getUser } from "../storage/db.js";
import { getInitials } from "../storage/helpers.js";

let contentContainer = null;

export function setContentContainer(el) {
  contentContainer = el;
}

export function refreshPage() {
  if (contentContainer) {
    renderRoute(getCurrentPath(), contentContainer);
  }
}

/* ── Mission handlers ── */

export function bindMissionHandlers(root) {
  root.addEventListener("click", (e) => {
    const doneBtn = e.target.closest("[data-action='toggle-mission']");
    if (doneBtn) {
      toggleMissionDone(doneBtn.dataset.id);
      return;
    }

    const solveBtn = e.target.closest("[data-action='mark-solved']");
    if (solveBtn) {
      markProblemSolved(solveBtn.dataset.id);
      return;
    }

    const startBtn = e.target.closest("[data-action='start-next']");
    if (startBtn) {
      const next = root.querySelector(".mission-card:not(.is-done) [data-action='toggle-mission']");
      if (next) toggleMissionDone(next.dataset.id);
      else showToast(Toast({ title: "All done!", text: "You've completed today's mission.", variant: "success" }));
    }

    const addMissionBtn = e.target.closest("[data-action='add-to-mission']");
    if (addMissionBtn) {
      addToMission(addMissionBtn.dataset.id, addMissionBtn.dataset.type || "new");
      showToast(Toast({ title: "Added to mission", variant: "success" }));
    }
  });
}

/* ── Problem filters ── */

export function bindFilterHandlers(root) {
  root.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;

    $$("[data-filter]", root).forEach((c) => c.classList.remove("is-selected"));
    chip.classList.add("is-selected");

    const filter = chip.dataset.filter;
    const rows = $$("[data-problem-row]", root);

    rows.forEach((row) => {
      const match = filter === "all"
        || row.dataset.difficulty === filter
        || row.dataset.topic?.toLowerCase().includes(filter)
        || row.dataset.status === filter;
      row.style.display = match ? "" : "none";
    });
  });
}

/* ── Search page ── */

export function bindSearchHandlers(root) {
  const input = $("#search-page-input", root);
  const resultsEl = $("#search-results", root);

  if (!input || !resultsEl) return;

  const runSearch = (q) => {
    if (q.trim()) addSearchRecent(q);
    import("../storage/computed.js").then(({ searchAll }) => {
      const results = searchAll(q);
      import("../pages/search.js").then(({ renderResults }) => {
        resultsEl.innerHTML = renderResults(results, q);
      });
    });
  };

  input.addEventListener("input", (e) => runSearch(e.target.value));

  root.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-recent-search]");
    if (chip) {
      input.value = chip.dataset.recentSearch;
      runSearch(chip.textContent.trim());
    }
  });

  if (input.value) runSearch(input.value);
}

/* ── Settings handlers ── */

export function bindSettingsHandlers(root) {
  const profileForm = $("#settings-profile-form", root);
  profileForm?.addEventListener("change", () => {
    const fd = new FormData(profileForm);
    updateUser({
      name: fd.get("name"),
      email: fd.get("email"),
      goal: fd.get("goal"),
    });
    syncUserState();
    showToast(Toast({ title: "Profile saved", variant: "success" }));
  });

  root.addEventListener("change", (e) => {
    const toggle = e.target.closest("[data-setting]");
    if (!toggle) return;
    const key = toggle.dataset.setting;

    if (key === "compactSidebar") {
      updateSettings({ compactSidebar: toggle.checked });
      setState({ sidebarCollapsed: toggle.checked });
    } else if (key === "darkMode") {
      setTheme(toggle.checked ? "dark" : "light");
    } else if (key.startsWith("notif.")) {
      updateNotificationSetting(key.replace("notif.", ""), toggle.checked);
    }
  });

  $("#export-data-btn", root)?.addEventListener("click", () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsa-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(Toast({ title: "Data exported", variant: "success" }));
  });

  const importInput = $("#import-data-input", root);
  $("#import-data-btn", root)?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result);
        showToast(Toast({ title: "Data imported", variant: "success" }));
        refreshPage();
      } catch {
        showToast(Toast({ title: "Import failed", text: "Invalid JSON file.", variant: "danger" }));
      }
    };
    reader.readAsText(file);
  });

  $("#clear-data-btn", root)?.addEventListener("click", () => {
    if (confirm("Clear ALL data? This cannot be undone.")) {
      clearAllData();
      showToast(Toast({ title: "Data cleared", variant: "info" }));
      refreshPage();
    }
  });
}

function syncUserState() {
  const u = getUser();
  setState({
    user: {
      name: u.name || "Learner",
      initials: getInitials(u.name || "Learner"),
      role: "DSA Learner",
    },
  });
}

/* ── Calendar month nav ── */

export function bindCalendarHandlers(root) {
  root.addEventListener("click", (e) => {
    const prev = e.target.closest("[data-cal-prev]");
    const next = e.target.closest("[data-cal-next]");
    const todayBtn = e.target.closest("[data-cal-today]");

    if (prev || next || todayBtn) {
      import("../storage/db.js").then(({ getCalendarMonth, setCalendarMonth }) => {
        let { year, month } = getCalendarMonth();
        if (todayBtn) {
          const now = new Date();
          year = now.getFullYear();
          month = now.getMonth();
        } else if (prev) {
          month--;
          if (month < 0) { month = 11; year--; }
        } else if (next) {
          month++;
          if (month > 11) { month = 0; year++; }
        }
        setCalendarMonth(year, month);
        refreshPage();
      });
    }
  });
}

/* ── Master binder ── */

export function bindPageHandlers(root) {
  bindMissionHandlers(root);
  bindFilterHandlers(root);
  bindSearchHandlers(root);
  bindSettingsHandlers(root);
  bindCalendarHandlers(root);
}