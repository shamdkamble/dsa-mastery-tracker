import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, EmptyState, SkeletonTable } from "../components/ui/index.js";
import {
  getPushDeliveryLogs,
  seedLearningFacts,
  deliverLearningFactToMe,
  deliverLearningFactToUser,
  previewLearningFactAnchor,
  AuthApiError,
} from "../services/auth.js";
import { showToast } from "../components/ui/interactions.js";
import { Toast } from "../components/ui/index.js";

const STATUS_FILTERS = ["all", "sent", "failed", "skipped"];
const SOURCE_FILTERS = ["all", "access", "test", "reminder", "redelivery", "learning-fact"];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusBadge(status) {
  const map = {
    sent: "success",
    failed: "danger",
    skipped: "warning",
  };
  return Badge({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    variant: map[status] || "default",
    size: "sm",
  });
}

function sourceBadge(source) {
  const labels = {
    access: "Access event",
    test: "Test",
    reminder: "Reminder",
    redelivery: "Redelivery",
    "learning-fact": "Learning fact",
  };
  return Badge({
    label: labels[source] || source,
    variant: "default",
    size: "sm",
  });
}

function statCard({ iconName, value, label, variant = "accent" }) {
  return `
    <div class="card admin-stat-card admin-stat-card--${variant}">
      <div class="card__body admin-stat-card__body">
        <div class="admin-stat-card__icon" aria-hidden="true">${icon(iconName)}</div>
        <div>
          <div class="admin-stat-card__value">${value}</div>
          <div class="admin-stat-card__label">${label}</div>
        </div>
      </div>
    </div>
  `;
}

function adminSubnav(active) {
  return `
    <nav class="admin-subnav" aria-label="Admin sections">
      <a href="#/admin" class="admin-subnav__link${active === "users" ? " is-active" : ""}">User Management</a>
      <a href="#/admin-push-logs" class="admin-subnav__link${active === "push-logs" ? " is-active" : ""}">Push Delivery Log</a>
    </nav>
  `;
}

function deviceLabel(userAgent) {
  if (!userAgent) return "—";
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return userAgent.slice(0, 40);
}

function resultDetail(log) {
  if (log.status === "sent") {
    return log.devicesTotal > 1
      ? `Delivered to device (${log.devicesSent}/${log.devicesTotal})`
      : "Delivered successfully";
  }

  if (log.status === "skipped") {
    const reasons = {
      push_not_configured: "VAPID keys not configured on server",
      no_subscriptions: "User has no push subscription on any device",
    };
    return reasons[log.reason] || log.reason || "Skipped";
  }

  const parts = [];
  if (log.reason) parts.push(log.reason.replace(/_/g, " "));
  if (log.errorCode) parts.push(`HTTP ${log.errorCode}`);
  if (log.errorMessage) parts.push(log.errorMessage.slice(0, 120));
  return parts.join(" · ") || "Delivery failed";
}

function logRow(log) {
  const userLabel = log.userName
    ? `${log.userName}${log.userEmail ? ` (${log.userEmail})` : ""}`
    : log.userId;

  return `
    <tr class="push-logs__row">
      <td class="push-logs__time">${formatDate(log.createdAt)}</td>
      <td class="push-logs__user">
        <div class="push-logs__user-name">${escapeHtml(userLabel)}</div>
        <div class="push-logs__user-id text-tertiary">${escapeHtml(log.userId)}</div>
      </td>
      <td>${sourceBadge(log.source)}</td>
      <td class="push-logs__event">
        <div>${escapeHtml(log.eventTag || "—")}</div>
        <div class="text-tertiary push-logs__title">${escapeHtml(log.title)}</div>
      </td>
      <td>${statusBadge(log.status)}</td>
      <td class="push-logs__device" title="${escapeHtml(log.userAgent || "")}">${escapeHtml(deviceLabel(log.userAgent))}</td>
      <td class="push-logs__result">
        <div class="push-logs__result-text">${escapeHtml(resultDetail(log))}</div>
        ${log.endpointPreview ? `<div class="text-tertiary push-logs__endpoint">${escapeHtml(log.endpointPreview)}</div>` : ""}
      </td>
    </tr>
  `;
}

function renderTable(logs) {
  if (!logs.length) {
    return EmptyState({
      title: "No push delivery logs yet",
      text: "Logs appear when access events, test pushes, reminders, or redelivery attempts run.",
      iconName: "bell",
    });
  }

  return `
    <div class="push-logs__table-wrap">
      <table class="table push-logs__table">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Source</th>
            <th>Event / Title</th>
            <th>Status</th>
            <th>Device</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(logRow).join("")}
        </tbody>
      </table>
      <p class="push-logs__count text-tertiary">Showing ${logs.length} most recent entries</p>
    </div>
  `;
}

export default {
  title: "Push Delivery Log",
  adminOnly: true,
  render() {
    return createPage({
      title: "Push Delivery Log",
      description: "Track every system push attempt — who it was sent to, whether it succeeded, and why it failed.",
      iconName: "bell",
      children: `
        <div class="admin-page push-logs">
          ${adminSubnav("push-logs")}

          <section class="card learning-facts-guide">
            <div class="card__body learning-facts-guide__body">
              <div>
                <h2 class="learning-facts-guide__title">Learning facts — how to push</h2>
                <ol class="learning-facts-guide__steps">
                  <li><strong>Seed facts</strong> — loads pilot facts into the database (you did this).</li>
                  <li><strong>Send fact</strong> — picks the user's current roadmap topic and sends bell + system push.</li>
                  <li><strong>Student taps notification</strong> — opens that topic's AI lesson on the roadmap.</li>
                </ol>
                <p class="learning-facts-guide__note text-secondary">
                  Automatic hourly delivery comes in Phase 2. For now, send manually with the buttons below.
                </p>
                <p class="learning-facts-guide__anchor text-tertiary" id="learning-facts-anchor-preview">Your anchor topic: loading…</p>
              </div>
              <div class="learning-facts-guide__actions">
                <button type="button" class="btn btn--primary btn--sm" id="learning-facts-send-me">
                  ${icon("bell")}
                  <span>Send fact to me</span>
                </button>
                <div class="learning-facts-guide__user-send">
                  <input
                    type="text"
                    class="input input--sm"
                    id="learning-facts-user-id"
                    placeholder="Student userId (e.g. user_173…)"
                    autocomplete="off"
                  />
                  <button type="button" class="btn btn--ghost btn--sm" id="learning-facts-send-user">
                    ${icon("user")}
                    <span>Send to student</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div class="admin-stats push-logs__stats" id="push-logs-stats">
            ${statCard({ iconName: "bell", value: "—", label: "Total attempts" })}
            ${statCard({ iconName: "check", value: "—", label: "Delivered", variant: "success" })}
            ${statCard({ iconName: "close", value: "—", label: "Failed", variant: "danger" })}
            ${statCard({ iconName: "alertCircle", value: "—", label: "Skipped", variant: "warning" })}
          </div>

          <section class="admin-section push-logs__panel">
            <div class="push-logs__toolbar">
              <div class="push-logs__search">
                <span class="push-logs__search-icon" aria-hidden="true">${icon("search")}</span>
                <input
                  type="search"
                  class="input push-logs__search-input"
                  id="push-logs-search"
                  placeholder="Search user, event, error…"
                  autocomplete="off"
                />
              </div>
              <div class="push-logs__filters">
                <label class="push-logs__filter-label" for="push-logs-status">Status</label>
                <select class="input input--sm" id="push-logs-status">
                  ${STATUS_FILTERS.map((s) => `
                    <option value="${s}">${s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  `).join("")}
                </select>
                <label class="push-logs__filter-label" for="push-logs-source">Source</label>
                <select class="input input--sm" id="push-logs-source">
                  ${SOURCE_FILTERS.map((s) => `
                    <option value="${s}">${s === "all" ? "All sources" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  `).join("")}
                </select>
                <button class="btn btn--ghost btn--sm" type="button" id="push-logs-refresh">
                  ${icon("repeat")}
                  <span>Refresh</span>
                </button>
                <button class="btn btn--ghost btn--sm" type="button" id="push-logs-seed-facts" title="Seed pilot learning facts into MongoDB">
                  ${icon("database")}
                  <span>Seed facts</span>
                </button>
                <span class="push-logs__updated text-tertiary" id="push-logs-updated" aria-live="polite"></span>
              </div>
            </div>

            <div id="push-logs-container" class="push-logs__content">
              ${SkeletonTable({ rows: 8, cols: 7 })}
            </div>
          </section>
        </div>
      `,
    });
  },
  onMount(container) {
    const listEl = container.querySelector("#push-logs-container");
    const statsEl = container.querySelector("#push-logs-stats");
    const searchInput = container.querySelector("#push-logs-search");
    const statusFilter = container.querySelector("#push-logs-status");
    const sourceFilter = container.querySelector("#push-logs-source");
    const refreshBtn = container.querySelector("#push-logs-refresh");
    const seedFactsBtn = container.querySelector("#push-logs-seed-facts");
    const sendMeBtn = container.querySelector("#learning-facts-send-me");
    const sendUserBtn = container.querySelector("#learning-facts-send-user");
    const userIdInput = container.querySelector("#learning-facts-user-id");
    const anchorPreview = container.querySelector("#learning-facts-anchor-preview");
    const updatedEl = container.querySelector("#push-logs-updated");

    let search = "";
    let status = "all";
    let source = "all";
    let searchTimer = null;
    let refreshTimer = null;

    function updateStats(stats) {
      if (!statsEl || !stats) return;
      const cards = statsEl.querySelectorAll(".admin-stat-card__value");
      if (cards[0]) cards[0].textContent = String(stats.total ?? 0);
      if (cards[1]) cards[1].textContent = String(stats.sent ?? 0);
      if (cards[2]) cards[2].textContent = String(stats.failed ?? 0);
      if (cards[3]) cards[3].textContent = String(stats.skipped ?? 0);
    }

    async function loadLogs() {
      listEl.innerHTML = SkeletonTable({ rows: 8, cols: 7 });

      try {
        const data = await getPushDeliveryLogs({
          limit: 150,
          status,
          source,
          search: search || undefined,
        });

        updateStats(data.stats);
        listEl.innerHTML = renderTable(data.logs);
        if (updatedEl) {
          updatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
        }
      } catch (err) {
        const message = err instanceof AuthApiError
          ? err.message
          : "Failed to load push delivery logs.";
        listEl.innerHTML = EmptyState({
          title: "Could not load logs",
          text: message,
          iconName: "alertCircle",
        });
      }
    }

    searchInput?.addEventListener("input", () => {
      search = searchInput.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { void loadLogs(); }, 300);
    });

    statusFilter?.addEventListener("change", () => {
      status = statusFilter.value;
      void loadLogs();
    });

    sourceFilter?.addEventListener("change", () => {
      source = sourceFilter.value;
      void loadLogs();
    });

    refreshBtn?.addEventListener("click", () => { void loadLogs(); });

    async function loadAnchorPreview() {
      if (!anchorPreview) return;
      try {
        const data = await previewLearningFactAnchor();
        if (!data.anchor) {
          anchorPreview.textContent = "Your anchor topic: none (admin may have completed all topics)";
          return;
        }
        const next = data.fact ? ` · next fact: "${data.fact.title}"` : " · no new facts left for this topic";
        anchorPreview.textContent = `Your anchor topic: ${data.anchor.topicName} (${data.anchor.topicId})${next}`;
      } catch {
        anchorPreview.textContent = "Your anchor topic: could not load";
      }
    }

    function formatDeliverResult(data) {
      const push = data.pushDelivery;
      if (push?.sent > 0) return "System push sent.";
      if (push?.skipped) return `No system push (${push.reason || "skipped"}). In-app bell still created.`;
      if (push?.failed > 0) return "Push failed — check delivery log below.";
      return "In-app notification created.";
    }

    function formatDeliverError(err, data) {
      if (data?.reason === "no_facts") {
        return "No facts for this user's topic. Seed facts first, or user anchor is past the 5 pilot topics.";
      }
      if (data?.reason === "already_delivered") {
        return "This user already received all facts for their current topic. They need to complete a topic or wait for more facts.";
      }
      if (data?.reason === "no_anchor") {
        return "Could not determine this user's current roadmap topic.";
      }
      return err instanceof AuthApiError ? err.message : "Delivery failed.";
    }

    sendMeBtn?.addEventListener("click", async () => {
      sendMeBtn.disabled = true;
      try {
        const data = await deliverLearningFactToMe({ sendPush: true });
        showToast(Toast({
          title: "Fact sent to you",
          text: `${data.fact?.title || "Learning fact"} — ${formatDeliverResult(data)}`,
          variant: "success",
        }));
        void loadLogs();
        void loadAnchorPreview();
      } catch (err) {
        const details = err instanceof AuthApiError ? err.details : null;
        showToast(Toast({
          title: "Could not send fact",
          text: formatDeliverError(err, details),
          variant: "danger",
        }));
      } finally {
        sendMeBtn.disabled = false;
      }
    });

    sendUserBtn?.addEventListener("click", async () => {
      const userId = userIdInput?.value?.trim();
      if (!userId) {
        showToast(Toast({
          title: "Enter a user ID",
          text: "Copy a student's userId from User Management (e.g. user_173…).",
          variant: "warning",
        }));
        return;
      }

      sendUserBtn.disabled = true;
      try {
        const data = await deliverLearningFactToUser(userId, { sendPush: true });
        showToast(Toast({
          title: "Fact sent to student",
          text: `${data.fact?.title || "Learning fact"} — ${formatDeliverResult(data)}`,
          variant: "success",
        }));
        void loadLogs();
      } catch (err) {
        const details = err instanceof AuthApiError ? err.details : null;
        showToast(Toast({
          title: "Could not send to student",
          text: formatDeliverError(err, details),
          variant: "danger",
        }));
      } finally {
        sendUserBtn.disabled = false;
      }
    });

    void loadAnchorPreview();

    seedFactsBtn?.addEventListener("click", async () => {
      seedFactsBtn.disabled = true;
      try {
        const data = await seedLearningFacts();
        showToast(Toast({
          title: "Pilot facts seeded",
          text: `${data.result?.total ?? 0} facts across ${data.result?.topicIds?.length ?? 0} topics.`,
          variant: "success",
        }));
      } catch (err) {
        showToast(Toast({
          title: "Seed failed",
          text: err instanceof AuthApiError ? err.message : "Could not seed learning facts.",
          variant: "danger",
        }));
      } finally {
        seedFactsBtn.disabled = false;
      }
    });

    refreshTimer = window.setInterval(() => { void loadLogs(); }, 30000);

    void loadLogs();

    return () => {
      clearTimeout(searchTimer);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  },
};