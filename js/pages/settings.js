import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Avatar, Button, Field, Input, Toggle, Badge } from "../components/ui/index.js";
import { getUser, getSettings, getProblems } from "../storage/db.js";
import { computeStats } from "../storage/computed.js";
import { getInitials } from "../storage/helpers.js";
import { getTheme } from "../theme.js";
import { getState } from "../state.js";
import { getSessionUser } from "../auth/session.js";
import { renderSubscriptionStatusCard } from "../subscription-theme.js";
import { bindPageHandlers } from "../controllers/page-controller.js";

const SETTINGS_NAV = [
  { id: "subscription", label: "Subscription", icon: "zap" },
  { id: "profile", label: "Profile", icon: "user" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "data", label: "Data", icon: "database" },
];

function settingsRow(label, hint, control) {
  return `
    <div class="settings-row">
      <div class="settings-row__info">
        <div class="settings-row__label">${label}</div>
        ${hint ? `<div class="settings-row__hint">${hint}</div>` : ""}
      </div>
      ${control}
    </div>
  `;
}

export default {
  title: "Settings",
  render() {
    const user = getUser();
    const settings = getSettings();
    const stats = computeStats();
    const joined = user.joined
      ? new Date(user.joined).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Recently";
    const isDark = getTheme() === "dark";
    const { sidebarCollapsed } = getState();
    const sessionUser = getSessionUser();

    return createPage({
      title: "Settings",
      description: "Customize your workspace, notifications, and data preferences.",
      children: `
        <div class="settings-layout">
          <nav class="settings-nav" aria-label="Settings sections">
            ${SETTINGS_NAV.map((item, i) => `
              <a href="#${item.id}" class="settings-nav__item${i === 0 ? " is-active" : ""}">
                ${icon(item.icon)}
                ${item.label}
              </a>
            `).join("")}
          </nav>

          <div class="settings-panel">
            <div id="subscription" class="settings-group settings-group--subscription">
              <h2 class="settings-group__title">Subscription</h2>
              <p class="settings-group__desc">Your plan controls roadmap access and AI features.</p>
              ${renderSubscriptionStatusCard(sessionUser)}
            </div>

            <div class="settings-profile">
              ${Avatar({ initials: getInitials(user.name || "Learner"), size: "xl" })}
              <div class="settings-profile__info">
                <h3>${user.name || "Set your name"}</h3>
                <p>${user.email || "No email set"}</p>
                <p class="text-xs text-tertiary mt-1">Member since ${joined}</p>
              </div>
            </div>

            <form id="settings-profile-form" class="settings-group">
              <h2 class="settings-group__title">Profile</h2>
              <p class="settings-group__desc">Manage your personal information and study goals. Changes save automatically.</p>
              <div class="ds-grid md:grid-cols-2 gap-4 mb-4">
                ${Field({ label: "Display name", children: Input({ value: user.name || "", attrs: 'name="name" placeholder="Your name"' }) })}
                ${Field({ label: "Email", children: Input({ type: "email", value: user.email || "", attrs: 'name="email" placeholder="you@email.com"' }) })}
              </div>
              ${Field({ label: "Study goal", hint: "Keeps you motivated on the dashboard", children: Input({ value: user.goal || "", attrs: 'name="goal" placeholder="e.g. Interview ready by August"' }) })}
            </form>

            <div class="settings-group">
              <h2 class="settings-group__title">Appearance</h2>
              <p class="settings-group__desc">Theme applies for this session only — resets when you close the tab.</p>
              ${settingsRow("Dark mode", "Use dark theme across the app", Toggle({ checked: isDark, id: "dark-mode", attrs: 'data-setting="darkMode"' }))}
              ${settingsRow("Compact sidebar", "Collapse sidebar by default", Toggle({ checked: sidebarCollapsed || settings.compactSidebar, attrs: 'data-setting="compactSidebar"' }))}
            </div>

            <div class="settings-group">
              <h2 class="settings-group__title">Notifications</h2>
              <p class="settings-group__desc">Control reminders and review alerts (stored locally).</p>
              ${settingsRow("Daily mission reminder", "Get notified at 9:00 AM", Toggle({ checked: settings.notifications.dailyReminder, attrs: 'data-setting="notif.dailyReminder"' }))}
              ${settingsRow("Streak at risk alert", "Warn when streak is about to break", Toggle({ checked: settings.notifications.streakAlert, attrs: 'data-setting="notif.streakAlert"' }))}
              ${settingsRow("Review due notifications", "Alert when spaced repetitions are due", Toggle({ checked: settings.notifications.reviewDue, attrs: 'data-setting="notif.reviewDue"' }))}
              ${settingsRow("Weekly progress summary", "Sunday evening recap", Toggle({ checked: settings.notifications.weeklySummary, attrs: 'data-setting="notif.weeklySummary"' }))}
            </div>

            <div class="settings-group">
              <h2 class="settings-group__title">Data</h2>
              <p class="settings-group__desc">Your data is stored locally in this browser via localStorage.</p>
              <div class="card card--compact mb-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-sm font-medium text-primary">${getProblems().length} problems tracked · ${stats.problemsSolved} solved</div>
                    <div class="text-xs text-tertiary mt-1">Stored in localStorage · Fully offline</div>
                  </div>
                  ${Badge({ label: "Local only", variant: "outline" })}
                </div>
              </div>
              <div class="cluster">
                <button class="btn btn--secondary" id="export-data-btn" type="button">${icon("download")}<span>Export Data</span></button>
                <button class="btn btn--outline" id="import-data-btn" type="button">Import Data</button>
                <input type="file" id="import-data-input" accept=".json" class="hidden" aria-hidden="true">
                <button class="btn btn--danger" id="clear-data-btn" type="button">Clear All Data</button>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
  },
};