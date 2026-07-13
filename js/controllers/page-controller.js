/**
 * Shared page interaction handlers
 */

import { $, $$ } from "../utils.js";
import {
  toggleMissionDone,
  addToMission,
  startProblemSolve,
  clearProblemSolveTimer,
  updateUser,
  updateSettings,
  updateNotificationSetting,
  exportData,
  importData,
  clearAllData,
} from "../storage/db.js";
import {
  navigate,
  getCurrentPath,
  refreshRouteContent,
  SETTINGS_SECTION_IDS as SETTINGS_SECTIONS,
} from "../router.js";
import { openProblemModal } from "../components/problem-modal.js";
import { openSolutionCompleteModal } from "../components/solution-complete-modal.js";
import { showToast, Toast } from "../components/ui/index.js";
import { getTheme, setTheme, toggleTheme } from "../theme.js";
import { getState, setState } from "../state.js";
import { getUser, getProblem } from "../storage/db.js";
import { getInitials } from "../storage/helpers.js";
import { renderProfileAvatar } from "../utils/profile-avatar.js";
import { compressImageFile } from "../utils/image-compress.js";
import { uploadProfilePhoto, removeProfilePhoto } from "../api/mediaApi.js";
import { getToken } from "../auth/session.js";
import { debounce } from "../utils.js";

let contentContainer = null;
let pageHandlersRoot = null;

export function setContentContainer(el) {
  contentContainer = el;
}

export function refreshPage() {
  if (contentContainer) {
    refreshRouteContent(getCurrentPath(), contentContainer);
  }
}

/* ── Mission handlers ── */

export function bindMissionHandlers(root) {
  if (root.dataset.missionHandlersBound) return;
  root.dataset.missionHandlersBound = "true";

  root.addEventListener("click", (e) => {
    const doneBtn = e.target.closest("[data-action='toggle-mission']");
    if (doneBtn) {
      const problemId = doneBtn.dataset.id;
      const problem = getProblem(problemId);
      if (problem && !problem.missionDone) {
        openSolutionCompleteModal(problemId, { mode: "mission" });
        return;
      }

      void toggleMissionDone(problemId)
        .then(() => refreshPage())
        .catch((err) => {
          console.error("[mission] toggle failed", err);
          showToast(Toast({ title: "Update failed", text: err?.message || "Could not update mission.", variant: "danger" }));
        });
      return;
    }

    const solveBtn = e.target.closest("[data-action='mark-solved']");
    if (solveBtn) {
      openSolutionCompleteModal(solveBtn.dataset.id, { mode: "solved" });
      return;
    }

    const startTimerBtn = e.target.closest("[data-action='start-timer']");
    if (startTimerBtn) {
      void startProblemSolve(startTimerBtn.dataset.id)
        .then(() => {
          showToast(Toast({
            title: "Timer started",
            text: "Click Solve to open LeetCode, then Done when finished.",
            variant: "info",
          }));
          refreshPage();
        })
        .catch((err) => {
          console.error("[solve-timer] start failed", err);
          showToast(Toast({ title: "Timer failed", text: err?.message || "Could not start timer.", variant: "danger" }));
        });
      return;
    }

    const resetSolveBtn = e.target.closest("[data-action='reset-solve'], [data-action='cancel-solve']");
    if (resetSolveBtn) {
      void clearProblemSolveTimer(resetSolveBtn.dataset.id)
        .then(() => {
          showToast(Toast({ title: "Timer reset", variant: "info" }));
          refreshPage();
        })
        .catch((err) => console.error("[solve-timer] reset failed", err));
      return;
    }

    const startBtn = e.target.closest("[data-action='start-next']");
    if (startBtn) {
      const nextCard = root.querySelector(".mission-card:not(.is-done)");
      if (!nextCard) {
        showToast(Toast({ title: "All done!", text: "You've completed today's mission.", variant: "success" }));
        return;
      }

      nextCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const solveLink = nextCard.querySelector("[data-action='start-solve']");
      if (solveLink) {
        solveLink.click();
      } else {
        showToast(Toast({
          title: "No LeetCode link",
          text: "Add a LeetCode URL to this problem before solving.",
          variant: "warning",
        }));
      }
      return;
    }

    const addMissionBtn = e.target.closest("[data-action='add-to-mission']");
    if (addMissionBtn) {
      void addToMission(addMissionBtn.dataset.id, addMissionBtn.dataset.type || "new")
        .then(() => {
          showToast(Toast({ title: "Added to mission", variant: "success" }));
          refreshPage();
        })
        .catch((err) => {
          console.error("[mission] add failed", err);
          showToast(Toast({ title: "Failed", text: err?.message || "Could not add to mission.", variant: "danger" }));
        });
      return;
    }
  });
}

/* ── Settings handlers ── */

async function handleClearStudyData(root) {
  const confirmed = confirm(
    "Delete all your study data?\n\n"
    + "This removes problems, notes, activity history, and roadmap progress from your account. "
    + "Your profile and settings are kept.\n\n"
    + "An administrator can restore this data for you later if needed.",
  );
  if (!confirmed) return;

  const btn = $("#clear-data-btn", root);
  btn?.setAttribute("disabled", "true");

  try {
    await clearAllData();
    const { resetRoadmapProgress } = await import("../storage/roadmap-progress.js");
    resetRoadmapProgress();
    showToast(Toast({
      title: "Study data deleted",
      text: "Your problems and progress have been cleared.",
      variant: "info",
    }));
    refreshPage();
  } catch (err) {
    showToast(Toast({
      title: "Delete failed",
      text: err?.message || "Could not clear your data. Try again.",
      variant: "danger",
    }));
    btn?.removeAttribute("disabled");
  }
}

export function bindSettingsHandlers(root) {
  if (root.dataset.settingsHandlersBound) return;
  root.dataset.settingsHandlersBound = "true";

  const saveProfile = debounce((scope) => {
    const profileForm = $("#settings-profile-form", scope);
    if (!profileForm) return;
    const fd = new FormData(profileForm);
    const goalEl = $("#profile-goal", scope);
    if (goalEl) fd.set("goal", goalEl.value);
    const photoInput = $("#profile-photo-data", scope);
    updateUser({
      name: String(fd.get("name") || "").trim(),
      bio: String(fd.get("bio") || "").trim(),
      goal: String(fd.get("goal") || "").trim(),
      profilePhoto: photoInput?.value || "",
    });
    syncUserState();
    showToast(Toast({ title: "Profile saved", variant: "success" }));
    refreshProfilePreview(scope);
  }, 500);

  root.addEventListener("input", (e) => {
    const inProfileForm = e.target.closest("#settings-profile-form") || e.target.id === "profile-goal";
    if (!inProfileForm) return;
    refreshProfilePreview(root);
    saveProfile(root);
  });

  root.addEventListener("change", (e) => {
    if (e.target.closest("#settings-profile-form")) {
      saveProfile(root);
      return;
    }

    if (e.target.id === "profile-photo-input") {
      const file = e.target.files?.[0];
      if (!file) return;
      void handleProfilePhotoUpload(root, file);
      e.target.value = "";
      return;
    }

    if (e.target.id === "import-data-input") {
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
      e.target.value = "";
      return;
    }

    const toggle = e.target.closest("[data-setting]");
    if (!toggle) return;
    const key = toggle.dataset.setting;

    if (key === "compactSidebar") {
      updateSettings({ compactSidebar: toggle.checked }, { silent: true });
      setState({ sidebarCollapsed: toggle.checked });
    } else if (key === "darkMode") {
      setTheme(toggle.checked ? "dark" : "light");
    } else if (key.startsWith("notif.")) {
      const notifKey = key.replace("notif.", "");
      updateNotificationSetting(notifKey, toggle.checked, { silent: true });
      import("../services/notification-preferences-sync.js").then(({ syncNotificationPreferenceToServer }) => {
        void syncNotificationPreferenceToServer(notifKey, toggle.checked);
      });
    }
  });

  root.addEventListener("click", (e) => {
    if (e.target.closest("#profile-photo-remove")) {
      handlePhotoRemove(root);
      return;
    }

    if (e.target.closest("#export-data-btn")) {
      const blob = new Blob([exportData()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dsamantra-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(Toast({ title: "Data exported", variant: "success" }));
      return;
    }

    if (e.target.closest("#import-data-btn")) {
      $("#import-data-input", root)?.click();
      return;
    }

    if (e.target.closest("#clear-data-btn")) {
      void handleClearStudyData(root);
    }
  });

}

const SETTINGS_SECTION_IDS = [...SETTINGS_SECTIONS];

function syncUserState() {
  const u = getUser();
  setState({
    user: {
      name: u.name || "Learner",
      initials: getInitials(u.name || "Learner"),
      role: "DSA Learner",
      profilePhoto: u.profilePhoto || "",
    },
  });
}

function refreshProfilePreview(root) {
  const u = getUser();
  const nameInput = $("#profile-name", root);
  const bioInput = $("#profile-bio", root);
  const displayName = nameInput?.value?.trim() || u.name || "Your name";
  const displayBio = bioInput?.value?.trim() ?? u.bio ?? "";

  const previewName = $("#profile-preview-name", root);
  const previewBio = $("#profile-preview-bio", root);
  const avatarHost = $("#profile-avatar-preview", root);
  if (previewName) previewName.textContent = displayName;
  if (previewBio) {
    previewBio.textContent = displayBio || "Add a short bio to personalize your profile.";
    previewBio.classList.toggle("settings-hero__bio--empty", !displayBio);
  }
  if (avatarHost) {
    const stateUser = getState().user;
    const previewUser = { ...u, name: displayName };
    avatarHost.innerHTML = renderProfileAvatar(previewUser, {
      ...stateUser,
      initials: getInitials(displayName),
    }, "profile-hero__avatar");
  }

  const removeBtn = $("#profile-photo-remove", root);
  if (u.profilePhoto && !removeBtn) {
    const actions = $(".settings-hero__photo", root);
    const uploadLabel = actions?.querySelector(".profile-photo-btn");
    if (actions && uploadLabel) {
      uploadLabel.insertAdjacentHTML(
        "afterend",
        '<button type="button" class="btn btn--ghost btn--sm" id="profile-photo-remove">Remove</button>',
      );
    }
  } else if (!u.profilePhoto && removeBtn) {
    removeBtn.remove();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read compressed image."));
    reader.readAsDataURL(blob);
  });
}

async function handleProfilePhotoUpload(root, file) {
  if (!file.type.startsWith("image/")) {
    showToast(Toast({ title: "Invalid file", text: "Please choose an image.", variant: "danger" }));
    return;
  }

  try {
    const { blob, mimeType } = await compressImageFile(file);
    let photoUrl = "";

    if (getToken()) {
      const result = await uploadProfilePhoto(blob, mimeType);
      photoUrl = result.url;
    } else {
      photoUrl = await blobToDataUrl(blob);
    }

    const hidden = $("#profile-photo-data", root);
    if (hidden) hidden.value = photoUrl;
    updateUser({ profilePhoto: photoUrl });
    syncUserState();
    refreshProfilePreview(root);
    showToast(Toast({ title: "Photo updated", variant: "success" }));
  } catch (err) {
    showToast(Toast({
      title: "Photo upload failed",
      text: err?.message || "Could not process image.",
      variant: "danger",
    }));
  }
}

async function handlePhotoRemove(root) {
  const currentPhoto = getUser().profilePhoto || "";
  const photoFileInput = $("#profile-photo-input", root);
  const hidden = $("#profile-photo-data", root);

  if (currentPhoto.startsWith("http") && getToken()) {
    try {
      await removeProfilePhoto(currentPhoto);
    } catch {
      /* keep local removal even if remote delete fails */
    }
  }

  if (hidden) hidden.value = "";
  if (photoFileInput) photoFileInput.value = "";
  updateUser({ profilePhoto: "" });
  syncUserState();
  refreshProfilePreview(root);
  showToast(Toast({ title: "Photo removed", variant: "info" }));
}

/* ── Calendar month nav ── */

export function bindCalendarHandlers(root) {
  if (root.dataset.calendarHandlersBound) return;
  root.dataset.calendarHandlersBound = "true";

  root.addEventListener("click", (e) => {
    const prev = e.target.closest("[data-cal-prev]");
    const next = e.target.closest("[data-cal-next]");
    const todayBtn = e.target.closest("[data-cal-today]");

    const dayBtn = e.target.closest("[data-cal-day]");
    if (dayBtn?.dataset.calDay) {
      import("../storage/db.js").then(({ setCalendarSelectedDate }) => {
        setCalendarSelectedDate(dayBtn.dataset.calDay);
        refreshPage();
      });
      return;
    }

    if (prev || next || todayBtn) {
      import("../storage/db.js").then(({ getCalendarMonth, setCalendarMonth, setCalendarSelectedDate }) => {
        let { year, month } = getCalendarMonth();
        if (todayBtn) {
          const now = new Date();
          year = now.getFullYear();
          month = now.getMonth();
          setCalendarSelectedDate(now.toISOString().slice(0, 10));
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
  const isNewRoot = pageHandlersRoot !== root;
  pageHandlersRoot = root;

  if (isNewRoot) {
    bindMissionHandlers(root);
    bindCalendarHandlers(root);
  }

  // Settings controls are rendered after first bind; delegation handles late-mounted elements.
  bindSettingsHandlers(root);
}