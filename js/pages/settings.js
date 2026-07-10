import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Field, Input, Textarea, Toggle, Badge } from "../components/ui/index.js";
import { getUser, getSettings, getProblems } from "../storage/db.js";
import { computeStats } from "../storage/computed.js";
import { getTheme } from "../theme.js";
import { getState } from "../state.js";
import { getSessionUser } from "../auth/session.js";
import { renderSubscriptionStatusCard, renderSubscriptionBadge } from "../subscription-theme.js";
import { renderProfileAvatar } from "../utils/profile-avatar.js";
import { bindPageHandlers } from "../controllers/page-controller.js";
import { BRAND } from "../constants/branding.js";

const SETTINGS_NAV = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "subscription", label: "Subscription", icon: "zap" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "data", label: "Data", icon: "database" },
  { id: "about", label: "About", icon: "info" },
];

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

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

function formatAccessLabel(sessionUser) {
  if (!sessionUser) return "Guest";
  if (sessionUser.role === "admin") return "Administrator";
  const level = sessionUser.accessLevel || "standard";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function renderReadOnlyField(label, value, hint = "") {
  return `
    <div class="profile-field profile-field--readonly">
      <span class="profile-field__label">${label}</span>
      <div class="profile-field__readonly">
        <span>${escapeHtml(value || "—")}</span>
        ${hint ? `<span class="profile-field__hint">${hint}</span>` : ""}
      </div>
    </div>
  `;
}

export default {
  title: "Profile & Settings",
  render() {
    const user = getUser();
    const settings = getSettings();
    const stats = computeStats();
    const sessionUser = getSessionUser();
    const stateUser = getState().user;
    const joined = user.joined
      ? new Date(user.joined).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "Recently";
    const isDark = getTheme() === "dark";
    const { sidebarCollapsed } = getState();
    const email = sessionUser?.email || user.email || "Not signed in";
    const subBadge = renderSubscriptionBadge(sessionUser);

    return createPage({
      title: "Profile & Settings",
      description: "Your personal workspace — profile, subscription, and preferences.",
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
            <section id="profile" class="settings-section">
              <div class="profile-hero">
                <div class="profile-hero__glow" aria-hidden="true"></div>
                <div class="profile-hero__main">
                  <div class="profile-hero__avatar-wrap" id="profile-avatar-preview">
                    ${renderProfileAvatar(user, stateUser, "profile-hero__avatar")}
                  </div>
                  <div class="profile-hero__content">
                    <div class="profile-hero__badges">
                      ${subBadge || Badge({ label: "Free", variant: "outline", size: "sm" })}
                    </div>
                    <h2 class="profile-hero__name" id="profile-preview-name">${escapeHtml(user.name || "Your name")}</h2>
                    <p class="profile-hero__bio${user.bio ? "" : " profile-hero__bio--empty"}" id="profile-preview-bio">
                      ${escapeHtml(user.bio || "Add a short bio to personalize your profile.")}
                    </p>
                    <p class="profile-hero__meta">
                      ${icon("calendar")}
                      <span>Member since ${escapeHtml(joined)}</span>
                    </p>
                  </div>
                </div>
                <div class="profile-hero__photo-actions">
                  <label class="btn btn--secondary btn--sm profile-photo-btn">
                    ${icon("user")}
                    <span>Upload photo</span>
                    <input type="file" id="profile-photo-input" accept="image/*" class="profile-photo-btn__input" hidden>
                  </label>
                  ${user.profilePhoto ? `
                    <button type="button" class="btn btn--ghost btn--sm" id="profile-photo-remove">Remove</button>
                  ` : ""}
                  <span class="profile-hero__photo-hint">Optional · JPG or PNG, max 200 KB</span>
                </div>
              </div>

              <form id="settings-profile-form" class="profile-cards">
                <input type="hidden" name="profilePhoto" id="profile-photo-data" value="${escapeAttr(user.profilePhoto || "")}">

                <article class="profile-card">
                  <header class="profile-card__head">
                    <h3 class="profile-card__title">${icon("user")} About you</h3>
                    <p class="profile-card__desc">How you appear across the app. Saves automatically.</p>
                  </header>
                  <div class="profile-card__body profile-card__body--stack">
                    ${Field({
                      label: "Display name",
                      hint: "Shown in the navbar and dashboard greeting",
                      children: Input({
                        value: user.name || "",
                        attrs: 'name="name" id="profile-name" placeholder="e.g. Alex Chen" autocomplete="name"',
                      }),
                    })}
                    ${Field({
                      label: "Bio",
                      hint: "A short intro — goals, background, or what you're preparing for",
                      children: Textarea({
                        rows: 4,
                        placeholder: "e.g. CS grad preparing for FAANG interviews. Focusing on graphs & DP.",
                        attrs: 'name="bio" id="profile-bio" maxlength="280"',
                        value: escapeHtml(user.bio || ""),
                      }),
                    })}
                  </div>
                </article>

                <article class="profile-card">
                  <header class="profile-card__head">
                    <h3 class="profile-card__title">${icon("target")} Learning goals</h3>
                    <p class="profile-card__desc">Your north star — surfaced on the dashboard.</p>
                  </header>
                  <div class="profile-card__body">
                    ${Field({
                      label: "Current focus",
                      hint: "Interview date, target companies, or skills you're building",
                      children: Textarea({
                        rows: 3,
                        placeholder: "e.g. Google L4 by September · Master DP patterns · 300 problems",
                        attrs: 'name="goal" id="profile-goal" maxlength="200"',
                        value: escapeHtml(user.goal || ""),
                      }),
                    })}
                  </div>
                </article>

                <article class="profile-card profile-card--readonly">
                  <header class="profile-card__head">
                    <h3 class="profile-card__title">${icon("shield")} Account</h3>
                    <p class="profile-card__desc">Managed by your account — contact admin to change.</p>
                  </header>
                  <div class="profile-card__body profile-card__body--grid">
                    ${renderReadOnlyField("Email", email, "Read-only for security")}
                    ${renderReadOnlyField("Access level", formatAccessLabel(sessionUser))}
                    ${renderReadOnlyField("Member since", joined)}
                    ${renderReadOnlyField("Problems tracked", `${getProblems().length} total · ${stats.problemsSolved} solved`)}
                  </div>
                </article>
              </form>
            </section>

            <section id="subscription" class="settings-section settings-group settings-group--subscription">
              <h2 class="settings-group__title">Subscription</h2>
              <p class="settings-group__desc">Your plan controls roadmap access and AI features.</p>
              ${renderSubscriptionStatusCard(sessionUser)}
            </section>

            <section id="appearance" class="settings-section settings-group">
              <h2 class="settings-group__title">Appearance</h2>
              <p class="settings-group__desc">Theme applies for this session only — resets when you close the tab.</p>
              <div class="settings-card">
                ${settingsRow("Dark mode", "Use dark theme across the app", Toggle({ checked: isDark, id: "dark-mode", attrs: 'data-setting="darkMode"' }))}
                ${settingsRow("Compact sidebar", "Collapse sidebar by default", Toggle({ checked: sidebarCollapsed || settings.compactSidebar, attrs: 'data-setting="compactSidebar"' }))}
              </div>
            </section>

            <section id="notifications" class="settings-section settings-group">
              <h2 class="settings-group__title">Notifications</h2>
              <p class="settings-group__desc">Push alerts for account updates; study reminders are stored locally for now.</p>
              <div class="settings-card">
                ${settingsRow("Push notifications", "Get system alerts when your account is approved", Toggle({ checked: settings.notifications.pushEnabled, attrs: 'data-setting="notif.pushEnabled"' }))}
                <p class="settings-push-status" id="push-status-text" aria-live="polite"></p>
                ${settingsRow("Daily mission reminder", "Get notified at 9:00 AM", Toggle({ checked: settings.notifications.dailyReminder, attrs: 'data-setting="notif.dailyReminder"' }))}
                ${settingsRow("Streak at risk alert", "Warn when streak is about to break", Toggle({ checked: settings.notifications.streakAlert, attrs: 'data-setting="notif.streakAlert"' }))}
                ${settingsRow("Review due notifications", "Alert when spaced repetitions are due", Toggle({ checked: settings.notifications.reviewDue, attrs: 'data-setting="notif.reviewDue"' }))}
                ${settingsRow("Weekly progress summary", "Sunday evening recap", Toggle({ checked: settings.notifications.weeklySummary, attrs: 'data-setting="notif.weeklySummary"' }))}
              </div>
            </section>

            <section id="data" class="settings-section settings-group">
              <h2 class="settings-group__title">Data</h2>
              <p class="settings-group__desc">Your study data is stored locally in this browser.</p>
              <div class="settings-card settings-card--data">
                <div class="settings-data-summary">
                  <div>
                    <div class="settings-data-summary__title">${getProblems().length} problems · ${stats.problemsSolved} solved</div>
                    <div class="settings-data-summary__hint">Stored in localStorage on this device</div>
                  </div>
                  ${Badge({ label: "Local only", variant: "outline" })}
                </div>
                <div class="cluster">
                  <button class="btn btn--secondary" id="export-data-btn" type="button">${icon("download")}<span>Export Data</span></button>
                  <button class="btn btn--outline" id="import-data-btn" type="button">Import Data</button>
                  <input type="file" id="import-data-input" accept=".json" class="hidden" aria-hidden="true">
                  <button class="btn btn--danger" id="clear-data-btn" type="button">Clear All Data</button>
                </div>
              </div>
            </section>

            <section id="about" class="settings-section settings-group">
              <h2 class="settings-group__title">About</h2>
              <p class="settings-group__desc">Product information and credits.</p>
              <article class="about-brand-card">
                <div class="about-brand-card__glow" aria-hidden="true"></div>
                <div class="about-brand-card__head">
                  <div class="about-brand-card__logo" aria-hidden="true">${icon("logo")}</div>
                  <div class="about-brand-card__identity">
                    <h3 class="about-brand-card__name">${escapeHtml(BRAND.name)}</h3>
                    <p class="about-brand-card__tagline">${escapeHtml(BRAND.tagline)}</p>
                  </div>
                </div>
                <p class="about-brand-card__desc">${escapeHtml(BRAND.description)}</p>
                <div class="about-brand-card__meta">
                  <div class="about-brand-card__meta-item">
                    <span class="about-brand-card__meta-label">Credit</span>
                    <span class="about-brand-card__meta-value">${escapeHtml(BRAND.credit)}</span>
                  </div>
                  <div class="about-brand-card__meta-item">
                    <span class="about-brand-card__meta-label">Author</span>
                    <span class="about-brand-card__meta-value">${escapeHtml(BRAND.author)}</span>
                  </div>
                </div>
              </article>
            </section>
          </div>
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
    import("../push-notifications.js").then(({ refreshPushStatusLabel }) => {
      void refreshPushStatusLabel(container);
    });
  },
};