import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { adminSubnav, adminHero } from "../components/admin-shell.js";

function archNode({ type, iconName, title, sub }) {
  return `
    <div class="arch-node arch-node--${type}">
      <div class="arch-node__icon" aria-hidden="true">${icon(iconName)}</div>
      <div class="arch-node__title">${title}</div>
      ${sub ? `<div class="arch-node__sub">${sub}</div>` : ""}
    </div>
  `;
}

function flowArrows() {
  return `
    <div class="arch-flow-arrows" aria-hidden="true">
      ${icon("chevronDown")}${icon("chevronDown")}${icon("chevronDown")}
    </div>
  `;
}

function sourceCard({ iconName, title, tag, body, flow, files, accent = "accent" }) {
  const accentColors = {
    accent: "var(--color-accent)",
    violet: "#a855f7",
    warning: "var(--color-warning)",
    success: "var(--color-success)",
    info: "var(--color-info)",
  };
  const color = accentColors[accent] || accentColors.accent;

  return `
    <article class="arch-source-card">
      <header class="arch-source-card__head">
        <div class="arch-source-card__icon" style="background: color-mix(in srgb, ${color} 16%, transparent); color: ${color}">
          ${icon(iconName)}
        </div>
        <span class="arch-source-card__title">${title}</span>
        <span class="arch-source-card__tag">${tag}</span>
      </header>
      <div class="arch-source-card__body">
        <p>${body}</p>
        ${flow ? `<pre class="arch-source-card__flow">${flow}</pre>` : ""}
        <div class="arch-source-card__files">
          ${files.map((f) => `<span class="arch-file-chip">${f}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function collectionChip(name, desc) {
  return `
    <div class="arch-collection">
      <div class="arch-collection__name">${name}</div>
      <div class="arch-collection__desc">${desc}</div>
    </div>
  `;
}

export default {
  title: "Notification Architecture",
  adminOnly: true,
  render() {
    return createPage({
      title: "Notification Architecture",
      description: "How DSAMantra triggers, personalizes, and delivers every notification.",
      iconName: "layers",
      children: `
        <div class="admin-page admin-page--modern arch-page">
          ${adminHero({
            title: "Notification Architecture",
            description: "End-to-end map of in-app bells, Web Push, cron jobs, Daily Wisdom, and delivery logging — your admin reference.",
            badge: "System map",
          })}
          ${adminSubnav("notifications")}

          <section class="arch-page__intro">
            <p class="text-secondary" style="margin:0;font-size:var(--text-sm);line-height:var(--leading-relaxed);max-width:60ch">
              Every alert follows the same spine: a <strong>trigger</strong> creates an in-app record, optional <strong>Web Push</strong> goes through VAPID,
              and <strong>PushDeliveryLog</strong> records success or failure. Scheduled jobs respect per-user timezone and preferences.
            </p>
            <div class="arch-legend" aria-label="Diagram legend">
              <span class="arch-legend__item"><span class="arch-legend__dot arch-legend__dot--trigger"></span>Trigger</span>
              <span class="arch-legend__item"><span class="arch-legend__dot arch-legend__dot--orch"></span>Orchestration</span>
              <span class="arch-legend__item"><span class="arch-legend__dot arch-legend__dot--content"></span>Content</span>
              <span class="arch-legend__item"><span class="arch-legend__dot arch-legend__dot--delivery"></span>Delivery</span>
              <span class="arch-legend__item"><span class="arch-legend__dot arch-legend__dot--client"></span>Client</span>
              <span class="arch-legend__item"><span class="arch-legend__dot arch-legend__dot--store"></span>Storage</span>
            </div>
          </section>

          <section class="arch-diagram" aria-label="Notification flow diagram">
            <div class="arch-diagram__lane-label">① Triggers — what starts a notification</div>
            <div class="arch-diagram__grid">
              ${archNode({ type: "trigger", iconName: "clock", title: "Vercel Cron", sub: "Daily ~9 AM IST" })}
              ${archNode({ type: "trigger", iconName: "shield", title: "Admin actions", sub: "Approve, patch access" })}
              ${archNode({ type: "trigger", iconName: "zap", title: "Admin manual", sub: "Send wisdom, test push" })}
              ${archNode({ type: "trigger", iconName: "user", title: "User events", sub: "Login redelivery" })}
              ${archNode({ type: "trigger", iconName: "bell", title: "Client test", sub: "Settings test btn" })}
            </div>

            ${flowArrows()}

            <div class="arch-diagram__lane-label">② Orchestration — routing & rules</div>
            <div class="arch-diagram__grid">
              ${archNode({ type: "orch", iconName: "repeat", title: "push-reminders.js", sub: "Mission, streak, reviews" })}
              ${archNode({ type: "orch", iconName: "zap", title: "learning-wisdom-daily.js", sub: "Daily Wisdom cron" })}
              ${archNode({ type: "orch", iconName: "shield", title: "access-notifications.js", sub: "Access copy + notify" })}
              ${archNode({ type: "orch", iconName: "gitBranch", title: "learning-fact-delivery.js", sub: "Anchor + dedup" })}
              ${archNode({ type: "orch", iconName: "link", title: "push-access-delivery.js", sub: "Missed push retry" })}
            </div>

            ${flowArrows()}

            <div class="arch-diagram__lane-label">③ Content & personalization</div>
            <div class="arch-diagram__grid">
              ${archNode({ type: "content", iconName: "database", title: "Mantra Feed", sub: "topic_learning_facts" })}
              ${archNode({ type: "content", iconName: "target", title: "Learning anchor", sub: "Next roadmap topic" })}
              ${archNode({ type: "content", iconName: "flame", title: "Wisdom context", sub: "Streak, tone, progress" })}
              ${archNode({ type: "content", iconName: "user", title: "Personalize", sub: "Name + progress copy" })}
              ${archNode({ type: "content", iconName: "calendar", title: "Study snapshot", sub: "Mission, reviews, streak" })}
            </div>

            ${flowArrows()}

            <div class="arch-diagram__lane-label">④ Delivery pipeline</div>
            <div class="arch-diagram__grid">
              ${archNode({ type: "delivery", iconName: "bell", title: "notifications-db", sub: "In-app bell record" })}
              ${archNode({ type: "delivery", iconName: "zap", title: "push-service.js", sub: "VAPID Web Push" })}
              ${archNode({ type: "delivery", iconName: "database", title: "push-delivery-log", sub: "Every attempt logged" })}
              ${archNode({ type: "delivery", iconName: "check", title: "markPushSent", sub: "Dedup + state" })}
              ${archNode({ type: "delivery", iconName: "layers", title: "UserFactDelivery", sub: "No repeat hooks" })}
            </div>

            ${flowArrows()}

            <div class="arch-diagram__lane-label">⑤ Client</div>
            <div class="arch-diagram__grid">
              ${archNode({ type: "client", iconName: "bell", title: "Service Worker", sub: "sw.js push handler" })}
              ${archNode({ type: "client", iconName: "link", title: "Deep link", sub: "#/roadmap?open=…" })}
              ${archNode({ type: "client", iconName: "bell", title: "In-app bell", sub: "Navbar dropdown" })}
              ${archNode({ type: "client", iconName: "settings", title: "Preferences", sub: "Settings toggles" })}
              ${archNode({ type: "client", iconName: "lock", title: "Push subscribe", sub: "VAPID keys" })}
            </div>
          </section>

          <h2 class="admin-section__title" style="margin:var(--space-2) 0 0">Notification sources (detail)</h2>
          <div class="arch-sources">
            ${sourceCard({
              iconName: "zap",
              title: "Daily Wisdom",
              tag: "learning-fact",
              accent: "violet",
              body: "Personalized roadmap hooks from the Mantra Feed. Picks next incomplete topic, never repeats the same hook, adapts copy to streak and last completed topic.",
              flow: "Cron 9AM (user TZ) → getWisdomDeliveryContext()\n→ pickNextFactForUser() → personalizeLearningFactMessage()\n→ createUserNotification() + sendPushToUser()\n→ recordUserFactDelivery()",
              files: [
                "learning-wisdom-daily.js",
                "learning-fact-delivery.js",
                "learning-wisdom-context.js",
                "learning-fact-personalize.js",
              ],
            })}
            ${sourceCard({
              iconName: "clock",
              title: "Study reminders",
              tag: "reminder",
              accent: "accent",
              body: "Cron-driven mission, review-due, streak-risk, and weekly summary pushes. Gated by notification preferences and PushReminderLog (once per day per type).",
              flow: "Cron → runScheduledPushReminders()\n→ computeStudySnapshot() per user\n→ sendPushToUser(source: reminder)",
              files: ["push-reminders.js", "study-metrics.js", "notification-preferences-db.js"],
            })}
            ${sourceCard({
              iconName: "shield",
              title: "Access events",
              tag: "access",
              accent: "warning",
              body: "Fired when admin approves, rejects, suspends, or changes access level. Always creates in-app notification; push sent immediately or on next login via redelivery.",
              flow: "adminUserAction() → notifyAccess*()\n→ createUserNotification()\n→ deliverPushForNotification()",
              files: ["access-notifications.js", "push-access-delivery.js"],
            })}
            ${sourceCard({
              iconName: "repeat",
              title: "Redelivery",
              tag: "redelivery",
              accent: "info",
              body: "On login, undelivered access notifications (pushSent=false) are retried so users who missed approval push still get the system alert.",
              flow: "fetchMe / login → deliverUndeliveredAccessPushes()\n→ listUndeliveredPushNotifications()",
              files: ["push-access-delivery.js", "notifications-db.js"],
            })}
            ${sourceCard({
              iconName: "bell",
              title: "Test push",
              tag: "test",
              accent: "success",
              body: "Admin and user test buttons in Settings. Validates VAPID config and device subscription without side effects.",
              flow: "POST /api/push/test → sendPushToUser(source: test)",
              files: ["push-service.js", "push-notifications.js"],
            })}
          </div>

          <h2 class="admin-section__title" style="margin-top:var(--space-6)">MongoDB collections</h2>
          <div class="arch-collections">
            ${collectionChip("user_notifications", "In-app bell items (title, text, href, pushSent)")}
            ${collectionChip("push_subscriptions", "Per-device Web Push endpoints")}
            ${collectionChip("push_delivery_logs", "Full audit trail — sent / failed / skipped")}
            ${collectionChip("notification_preferences", "dailyWisdom, reminders, timezone")}
            ${collectionChip("push_reminder_logs", "Daily dedup for cron reminders + wisdom")}
            ${collectionChip("topic_learning_facts", "Mantra Feed hooks per topic")}
            ${collectionChip("user_fact_deliveries", "Which hooks each user has seen")}
          </div>
        </div>
      `,
    });
  },
};