/**
 * Daily Wisdom admin console — markup & render helpers
 */

import { icon } from "./icons.js";
import { Badge } from "./ui/index.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRelativeTime(iso) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status) {
  const map = { sent: "success", failed: "danger", skipped: "warning" };
  return Badge({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    variant: map[status] || "default",
    size: "sm",
  });
}

function metricCard({ label, value, sub, variant = "default" }) {
  return `
    <div class="dw-metric dw-metric--${variant}">
      <div class="dw-metric__label">${label}</div>
      <div class="dw-metric__value">${value}</div>
      ${sub ? `<div class="dw-metric__sub">${sub}</div>` : ""}
    </div>
  `;
}

export function renderDailyWisdomPanelShell() {
  return `
    <section class="dw-console card" id="dw-console" aria-label="Daily Wisdom admin console">
      <header class="dw-console__header">
        <div class="dw-console__title-row">
          <div class="dw-console__brand">
            <span class="dw-console__icon" aria-hidden="true">${icon("zap")}</span>
            <div>
              <h2 class="dw-console__title">Daily Wisdom</h2>
              <p class="dw-console__subtitle">Mantra Feed · personalized roadmap insights</p>
            </div>
          </div>
          <span class="dw-console__live" id="dw-console-status">
            <span class="dw-console__live-dot" aria-hidden="true"></span>
            <span>Loading…</span>
          </span>
        </div>
      </header>

      <div class="dw-console__metrics" id="dw-console-metrics">
        ${metricCard({ label: "Topics covered", value: "—", sub: "loading" })}
        ${metricCard({ label: "Hooks generated", value: "—", sub: "active in pool" })}
        ${metricCard({ label: "Last delivery", value: "—", sub: "30-day window" })}
        ${metricCard({ label: "Success rate", value: "—", sub: "push deliveries", variant: "accent" })}
      </div>

      <div class="dw-console__actions">
        <button type="button" class="btn btn--primary" id="dw-generate-missing">
          ${icon("zap")}
          <span>Generate Missing Hooks</span>
        </button>
        <button type="button" class="btn btn--secondary" id="dw-send-test">
          ${icon("bell")}
          <span>Send Test to Me</span>
        </button>
        <button type="button" class="btn btn--outline" id="dw-run-cron">
          ${icon("repeat")}
          <span>Run Daily Cron Now</span>
        </button>
      </div>

      <div class="dw-gen-progress hidden" id="dw-gen-progress" aria-live="polite">
        <div class="dw-gen-progress__head">
          <div>
            <p class="dw-gen-progress__label">Mantra Feed generation</p>
            <p class="dw-gen-progress__status" id="dw-gen-status">Starting…</p>
          </div>
          <button type="button" class="btn btn--danger btn--sm" id="dw-gen-stop">
            ${icon("close")}
            <span>Stop</span>
          </button>
        </div>
        <div class="dw-gen-progress__bar-track" aria-hidden="true">
          <div class="dw-gen-progress__bar-fill" id="dw-gen-bar" style="width: 0%"></div>
        </div>
        <div class="dw-gen-progress__meta">
          <span id="dw-gen-eta" class="dw-gen-progress__eta text-tertiary">Estimating…</span>
          <span id="dw-gen-counts" class="dw-gen-progress__counts text-secondary"></span>
        </div>
        <ul class="dw-gen-log" id="dw-gen-log"></ul>
      </div>

      <details class="dw-console__activity" id="dw-activity-panel">
        <summary class="dw-console__activity-summary">
          <span class="dw-console__activity-title">Recent activity</span>
          <button type="button" class="btn btn--ghost btn--sm" id="dw-refresh-activity">
            ${icon("repeat")}
            <span>Refresh</span>
          </button>
        </summary>
        <div class="dw-console__activity-body">
          <div class="dw-console__activity-list" id="dw-activity-list">
            <p class="dw-console__activity-empty text-tertiary">Loading activity…</p>
          </div>
        </div>
      </details>

      <details class="dw-console__advanced">
        <summary class="dw-console__advanced-toggle">
          ${icon("settings")}
          <span>Advanced settings</span>
        </summary>
        <div class="dw-console__advanced-body">
          <div class="dw-console__preview" id="dw-preview">
            <span class="dw-console__preview-label">Your next preview</span>
            <p class="dw-console__preview-text text-secondary">Loading…</p>
          </div>
          <div class="dw-console__field dw-console__field--recipients">
            <span class="dw-console__field-label">Recipients</span>
            <input
              type="search"
              class="input input--sm"
              id="dw-user-search"
              placeholder="Search by name or email…"
              autocomplete="off"
            />
            <div class="dw-user-picker" id="dw-user-picker">
              <label class="dw-user-picker__all">
                <input type="checkbox" id="dw-select-all-users" />
                <span>All users</span>
              </label>
              <div class="dw-user-picker__list" id="dw-user-list">
                <p class="dw-user-picker__empty text-tertiary">Loading users…</p>
              </div>
            </div>
            <p class="dw-user-picker__hint text-tertiary" id="dw-user-selection-count">0 selected</p>
          </div>

          <div class="dw-console__advanced-grid">
            <label class="dw-console__field">
              <span class="dw-console__field-label">Send Daily Wisdom</span>
              <div class="dw-console__field-row">
                <button type="button" class="btn btn--ghost btn--sm" id="dw-send-student">
                  ${icon("user")}
                  <span>Send to selected</span>
                </button>
              </div>
            </label>
            <div class="dw-console__field dw-console__field--actions">
              <span class="dw-console__field-label">Maintenance</span>
              <div class="dw-console__field-row">
                <button type="button" class="btn btn--ghost btn--sm" id="dw-seed-pilot">
                  ${icon("database")}
                  <span>Seed pilot hooks</span>
                </button>
                <button type="button" class="btn btn--ghost btn--sm" id="dw-regenerate-all" title="Regenerate all topics (replaces existing hooks)">
                  ${icon("repeat")}
                  <span>Regenerate all</span>
                </button>
              </div>
            </div>
          </div>

          <label class="dw-console__field dw-console__field--manual">
            <span class="dw-console__field-label">Custom notification</span>
            <input type="text" class="input input--sm" id="dw-manual-title" placeholder="Notification title" autocomplete="off" />
            <textarea class="input input--sm dw-manual-text" id="dw-manual-text" rows="2" placeholder="Message for selected users…"></textarea>
            <div class="dw-console__field-row">
              <button type="button" class="btn btn--secondary btn--sm" id="dw-send-manual">
                ${icon("bell")}
                <span>Send to selected</span>
              </button>
            </div>
          </label>
        </div>
      </details>
    </section>
  `;
}

export function renderActivityList(logs) {
  if (!logs?.length) {
    return `<p class="dw-console__activity-empty text-tertiary">No Daily Wisdom deliveries yet. Send a test or run the cron.</p>`;
  }

  return `
    <ul class="dw-activity">
      ${logs.map((log) => {
        const user = log.userName || log.userId || "Unknown";
        return `
          <li class="dw-activity__item">
            <div class="dw-activity__main">
              <span class="dw-activity__time" title="${escapeHtml(formatDateTime(log.createdAt))}">${formatRelativeTime(log.createdAt)}</span>
              <span class="dw-activity__user">${escapeHtml(user)}</span>
              <span class="dw-activity__title">${escapeHtml(log.title || "Daily Wisdom")}</span>
            </div>
            <div class="dw-activity__meta">
              ${statusBadge(log.status)}
              <span class="dw-activity__topic text-tertiary">${escapeHtml(log.eventTag || "—")}</span>
            </div>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

export function renderMetrics(dashboard) {
  const pool = dashboard?.pool || {};
  const delivery = dashboard?.delivery || {};

  const topicsSub = pool.topicsMissingFacts > 0
    ? `${pool.topicsMissingFacts} need hooks`
    : "All topics covered";

  const hooksSub = `${pool.factsPerTopicTarget || 5} per topic target`;

  const lastVal = formatRelativeTime(delivery.lastRunAt);
  const lastSub = delivery.lastRunAt
    ? formatDateTime(delivery.lastRunAt)
    : "No deliveries yet";

  const rateVal = delivery.successRate != null ? `${delivery.successRate}%` : "—";
  const rateSub = delivery.total > 0
    ? `${delivery.sent} sent · ${delivery.failed} failed · ${delivery.skipped} skipped`
    : "No attempts in 30 days";

  return `
    ${metricCard({
      label: "Topics covered",
      value: `${pool.topicsWithFacts ?? 0}<span class="dw-metric__dim">/${pool.totalTopics ?? 0}</span>`,
      sub: `${pool.topicsCoveredPct ?? 0}% · ${topicsSub}`,
      variant: pool.topicsMissingFacts > 0 ? "warning" : "success",
    })}
    ${metricCard({
      label: "Hooks generated",
      value: String(pool.totalActiveFacts ?? 0),
      sub: hooksSub,
    })}
    ${metricCard({
      label: "Last delivery",
      value: lastVal,
      sub: lastSub,
    })}
    ${metricCard({
      label: "Success rate",
      value: rateVal,
      sub: rateSub,
      variant: "accent",
    })}
  `;
}

export function renderConsoleStatus(dashboard) {
  const missing = dashboard?.pool?.topicsMissingFacts ?? 0;
  const rate = dashboard?.delivery?.successRate;

  if (missing > 0) {
    return `<span class="dw-console__live-dot dw-console__live-dot--warn" aria-hidden="true"></span><span>${missing} topics need hooks</span>`;
  }
  if (rate != null && rate < 70) {
    return `<span class="dw-console__live-dot dw-console__live-dot--warn" aria-hidden="true"></span><span>Low delivery rate</span>`;
  }
  return `<span class="dw-console__live-dot dw-console__live-dot--ok" aria-hidden="true"></span><span>Operational</span>`;
}

export function formatEta(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "Almost done…";
  if (seconds < 60) return `~${Math.ceil(seconds)}s remaining`;
  const mins = Math.ceil(seconds / 60);
  return `~${mins} min remaining`;
}

export function renderGenProgress({
  batchIndex,
  totalBatches,
  completedTopics,
  queueTotal,
  succeeded,
  failed,
  skipped,
  etaSeconds,
}) {
  const pct = queueTotal > 0 ? Math.min(100, Math.round((completedTopics / queueTotal) * 100)) : 0;

  return {
    status: `Batch ${batchIndex} of ${totalBatches} · ${completedTopics}/${queueTotal} topics`,
    barWidth: `${pct}%`,
    eta: formatEta(etaSeconds),
    counts: `Success ${succeeded} · Failed ${failed} · Skipped ${skipped}`,
  };
}

export function appendGenLogEntry(logEl, { status, message }) {
  if (!logEl) return;
  const li = document.createElement("li");
  li.className = `dw-gen-log__item dw-gen-log__item--${status || "info"}`;
  const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  li.innerHTML = `<span class="dw-gen-log__time">${time}</span><span class="dw-gen-log__msg">${escapeHtml(message)}</span>`;
  logEl.prepend(li);
  while (logEl.children.length > 12) {
    logEl.removeChild(logEl.lastChild);
  }
}

export function renderUserPickerList(users, { search = "" } = {}) {
  const q = search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    if (!q) return true;
    return user.name.toLowerCase().includes(q)
      || user.email.toLowerCase().includes(q);
  });

  if (!filtered.length) {
    return `<p class="dw-user-picker__empty text-tertiary">No users match your search.</p>`;
  }

  return filtered.map((user) => `
    <label class="dw-user-picker__item">
      <input type="checkbox" class="dw-user-checkbox" value="${escapeHtml(user.id)}" data-user-name="${escapeHtml(user.name)}" />
      <span class="dw-user-picker__item-main">
        <span class="dw-user-picker__name">${escapeHtml(user.name)}</span>
        <span class="dw-user-picker__email text-tertiary">${escapeHtml(user.email)}</span>
      </span>
    </label>
  `).join("");
}

export function renderPreviewText(preview) {
  if (!preview?.anchor) {
    return "No next topic (all complete or locked).";
  }
  if (preview.previewMessage) {
    const ctx = preview.context;
    const bits = [];
    if (ctx?.lastCompleted?.topicName) bits.push(`after ${ctx.lastCompleted.topicName}`);
    if (ctx?.streak >= 2) bits.push(`${ctx.streak}-day streak`);
    const ctxLabel = bits.length ? ` · ${bits.join(" · ")}` : "";
    return `<strong>${escapeHtml(preview.anchor.topicName)}</strong>${escapeHtml(ctxLabel)} — "${escapeHtml(preview.previewMessage.title)}"`;
  }
  return `<strong>${escapeHtml(preview.anchor.topicName)}</strong> — no unused hooks (generate missing first).`;
}