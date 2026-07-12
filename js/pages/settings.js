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

function renderSettingsBlock({ id, iconName, title, description, body, priority }) {
  return `
    <section id="${id}" class="settings-block settings-section">
      <header class="settings-block__head">
        <span class="settings-block__priority" aria-hidden="true">${priority}</span>
        <span class="settings-block__icon" aria-hidden="true">${icon(iconName)}</span>
        <div class="settings-block__titles">
          <h2 class="settings-block__title">${title}</h2>
          ${description ? `<p class="settings-block__desc">${description}</p>` : ""}
        </div>
      </header>
      <div class="settings-block__body">
        ${body}
      </div>
    </section>
  `;
}

function renderAccountTile(label, value, hint = "") {
  return `
    <div class="settings-account-tile">
      <span class="settings-account-tile__label">${label}</span>
      <span class="settings-account-tile__value">${escapeHtml(value || "—")}</span>
      ${hint ? `<span class="settings-account-tile__hint">${hint}</span>` : ""}
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
    const problemCount = getProblems().length;

    return createPage({
      title: "Profile & Settings",
      description: "Manage your identity, study reminders, and workspace preferences.",
      children: `
        <div class="settings-page">
          <div class="settings-hero">
            <div class="settings-hero__glow" aria-hidden="true"></div>
            <div class="settings-hero__top">
              <div class="settings-hero__identity">
                <div class="settings-hero__avatar" id="profile-avatar-preview">
                  ${renderProfileAvatar(user, stateUser, "profile-hero__avatar")}
                </div>
                <div class="settings-hero__info">
                  <div class="settings-hero__badges">
                    ${subBadge || Badge({ label: "Free", variant: "outline", size: "sm" })}
                    ${sessionUser ? Badge({ label: formatAccessLabel(sessionUser), variant: "default", size: "sm" }) : ""}
                  </div>
                  <h2 class="settings-hero__name" id="profile-preview-name">${escapeHtml(user.name || "Your name")}</h2>
                  <p class="settings-hero__email">${escapeHtml(email)}</p>
                  <p class="settings-hero__bio${user.bio ? "" : " settings-hero__bio--empty"}" id="profile-preview-bio">
                    ${escapeHtml(user.bio || "Add a bio below — it appears here and on your dashboard.")}
                  </p>
                </div>
              </div>
              <div class="settings-hero__photo">
                <label class="btn btn--secondary btn--sm profile-photo-btn">
                  ${icon("user")}
                  <span>Photo</span>
                  <input type="file" id="profile-photo-input" accept="image/*" class="profile-photo-btn__input" hidden>
                </label>
                ${user.profilePhoto ? `
                  <button type="button" class="btn btn--ghost btn--sm" id="profile-photo-remove">Remove</button>
                ` : ""}
              </div>
            </div>
            <div class="settings-hero__stats">
              <div class="settings-stat">
                <span class="settings-stat__value">${stats.problemsSolved}</span>
                <span class="settings-stat__label">Solved</span>
              </div>
              <div class="settings-stat">
                <span class="settings-stat__value">${stats.currentStreak}d</span>
                <span class="settings-stat__label">Streak</span>
              </div>
              <div class="settings-stat">
                <span class="settings-stat__value">${stats.accuracy}%</span>
                <span class="settings-stat__label">Accuracy</span>
              </div>
              <div class="settings-stat">
                <span class="settings-stat__value">${problemCount}</span>
                <span class="settings-stat__label">Tracked</span>
              </div>
            </div>
          </div>

          ${renderSettingsBlock({
            id: "profile",
            iconName: "user",
            priority: "1",
            title: "Your profile",
            description: "How you appear across DSAMantra. Changes save automatically.",
            body: `
              <form id="settings-profile-form" class="settings-form">
                <input type="hidden" name="profilePhoto" id="profile-photo-data" value="${escapeAttr(user.profilePhoto || "")}">
                <div class="settings-form__grid">
                  ${Field({
                    label: "Display name",
                    hint: "Navbar greeting and profile",
                    children: Input({
                      value: user.name || "",
                      attrs: 'name="name" id="profile-name" placeholder="e.g. Alex Chen" autocomplete="name"',
                    }),
                  })}
                  ${Field({
                    label: "Bio",
                    hint: "Short intro — max 280 characters",
                    children: Textarea({
                      rows: 3,
                      placeholder: "e.g. CS grad preparing for FAANG interviews. Focusing on graphs & DP.",
                      attrs: 'name="bio" id="profile-bio" maxlength="280"',
                      value: escapeHtml(user.bio || ""),
                    }),
                  })}
                </div>
              </form>
            `,
          })}

          ${renderSettingsBlock({
            id: "goals",
            iconName: "target",
            priority: "2",
            title: "Learning focus",
            description: "Your north star — keep interview targets and skills visible.",
            body: `
              <div class="settings-form">
                ${Field({
                  label: "Current goals",
                  hint: "Interview date, companies, or patterns you're mastering",
                  children: Textarea({
                    rows: 3,
                    placeholder: "e.g. Google L4 by September · Master DP · 300 problems",
                    attrs: 'name="goal" id="profile-goal" maxlength="200" form="settings-profile-form"',
                    value: escapeHtml(user.goal || ""),
                  }),
                })}
              </div>
            `,
          })}

          ${renderSettingsBlock({
            id: "subscription",
            iconName: "zap",
            priority: "3",
            title: "Plan & access",
            description: "Roadmap phases, AI lessons, and premium features.",
            body: renderSubscriptionStatusCard(sessionUser) || `
              <p class="text-sm text-secondary">Sign in to view your subscription status.</p>
            `,
          })}

          ${renderSettingsBlock({
            id: "notifications",
            iconName: "bell",
            priority: "4",
            title: "Notifications",
            description: "System alerts and spaced-revision reminders on this device.",
            body: `
              <div class="settings-card settings-card--nested">
                <div class="settings-card__subsection">
                  <h3 class="settings-card__subtitle">System notifications</h3>
                  <p class="settings-card__subsection-desc">Enabling opens your device permission prompt — Allow or Block alerts outside the app.</p>
                </div>
                <div class="settings-push-ios-callout" id="push-ios-callout" hidden>
                  <p class="settings-push-ios-callout__title">For iOS users</p>
                  <p class="settings-push-ios-callout__text">Open the app from Home Screen, then enable notifications below.</p>
                  <ol class="settings-push-ios-callout__steps">
                    <li>In Safari, tap <strong>Share</strong> → <strong>Add to Home Screen</strong></li>
                    <li>Open <strong>DSAMantra</strong> from your Home Screen</li>
                    <li>Turn on <strong>System notifications</strong> below</li>
                    <li>Tap <strong>Allow</strong> when iOS asks for permission</li>
                  </ol>
                </div>
                ${settingsRow("System notifications", "Alerts on this phone or browser", Toggle({ checked: settings.notifications.pushEnabled, id: "push-notifications-toggle", attrs: 'data-push-system-toggle aria-describedby="push-status-text"' }))}
                <p class="settings-push-status" id="push-status-text" aria-live="polite"></p>
                <div class="settings-push-actions">
                  <button type="button" class="btn btn--secondary btn--sm" id="push-test-btn">Send test notification</button>
                </div>
              </div>
              <div class="settings-card settings-card--nested settings-card--study-reminders">
                <div class="settings-card__subsection">
                  <h3 class="settings-card__subtitle">Study reminders</h3>
                  <p class="settings-card__subsection-desc">Scheduled push when system notifications are on · Asia/Kolkata timezone.</p>
                </div>
                ${settingsRow("Daily mission", "9:00 AM — today's mission tasks", Toggle({ checked: settings.notifications.dailyReminder, attrs: 'data-setting="notif.dailyReminder"' }))}
                ${settingsRow("Streak at risk", "8:00 PM — if you haven't solved today", Toggle({ checked: settings.notifications.streakAlert, attrs: 'data-setting="notif.streakAlert"' }))}
                ${settingsRow("Revision due", "9:00 AM — spaced repetition reviews", Toggle({ checked: settings.notifications.reviewDue, attrs: 'data-setting="notif.reviewDue"' }))}
                ${settingsRow("Weekly summary", "Sunday 6:00 PM — progress recap", Toggle({ checked: settings.notifications.weeklySummary, attrs: 'data-setting="notif.weeklySummary"' }))}
                ${settingsRow("Daily Wisdom", "9:00 AM — insight for your next roadmap topic", Toggle({ checked: settings.notifications.dailyWisdom !== false, attrs: 'data-setting="notif.dailyWisdom"' }))}
              </div>
            `,
          })}

          ${renderSettingsBlock({
            id: "appearance",
            iconName: "palette",
            priority: "5",
            title: "Appearance",
            description: "Visual preferences for this device.",
            body: `
              <div class="settings-card settings-card--nested settings-card--flat">
                ${settingsRow("Dark mode", "Comfortable low-light theme", Toggle({ checked: isDark, id: "dark-mode", attrs: 'data-setting="darkMode"' }))}
                ${settingsRow("Compact sidebar", "More room for content", Toggle({ checked: sidebarCollapsed || settings.compactSidebar, attrs: 'data-setting="compactSidebar"' }))}
              </div>
            `,
          })}

          ${renderSettingsBlock({
            id: "account",
            iconName: "shield",
            priority: "6",
            title: "Account",
            description: "Read-only details — contact an admin to change access.",
            body: `
              <div class="settings-account-grid">
                ${renderAccountTile("Email", email, "Secured sign-in")}
                ${renderAccountTile("Access", formatAccessLabel(sessionUser))}
                ${renderAccountTile("Member since", joined)}
                ${renderAccountTile("Progress", `${stats.problemsSolved} solved · ${problemCount} tracked`)}
              </div>
            `,
          })}

          ${renderSettingsBlock({
            id: "data",
            iconName: "database",
            priority: "7",
            title: "Study data",
            description: "Export a backup, import progress, or wipe problems and activity.",
            body: `
              <div class="settings-card settings-card--nested settings-card--data">
                <div class="settings-data-summary">
                  <div>
                    <div class="settings-data-summary__title">${problemCount} problems · ${stats.problemsSolved} solved</div>
                    <div class="settings-data-summary__hint">Problems sync to your account when signed in</div>
                  </div>
                  ${sessionUser ? Badge({ label: "Cloud sync", variant: "outline" }) : Badge({ label: "This device", variant: "outline" })}
                </div>
                <div class="settings-data-actions">
                  <button class="btn btn--secondary" id="export-data-btn" type="button">${icon("download")}<span>Export</span></button>
                  <button class="btn btn--outline" id="import-data-btn" type="button">Import</button>
                  <input type="file" id="import-data-input" accept=".json" class="hidden" aria-hidden="true">
                  <button class="btn btn--danger btn--ghost" id="clear-data-btn" type="button">Delete all study data</button>
                </div>
              </div>
            `,
          })}

          ${renderSettingsBlock({
            id: "about",
            iconName: "info",
            priority: "8",
            title: "About",
            description: "Product information.",
            body: `
              <article class="about-brand-card about-brand-card--compact">
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
            `,
          })}
        </div>
      `,
    });
  },
  onMount(container) {
    bindPageHandlers(container);
    import("../router.js").then(({ getCurrentSection, SETTINGS_SECTION_IDS }) => {
      const section = getCurrentSection();
      if (section && SETTINGS_SECTION_IDS.has(section)) {
        document.getElementById(section)?.scrollIntoView({ block: "start" });
      }
    });
    import("../push-notifications.js").then(({ bindPushSettingsUI, bindPushTestButton, bindPushToggleHandler }) => {
      bindPushToggleHandler(container);
      void bindPushSettingsUI(container);
      bindPushTestButton(container);
    });
  },
};