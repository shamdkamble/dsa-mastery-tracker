import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, EmptyState, SkeletonTable } from "../components/ui/index.js";
import { getPushDeliveryLogs, AuthApiError } from "../services/auth.js";

const STATUS_FILTERS = ["all", "sent", "failed", "skipped"];
const SOURCE_FILTERS = ["all", "access", "test", "reminder", "redelivery"];

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

    refreshTimer = window.setInterval(() => { void loadLogs(); }, 30000);

    void loadLogs();

    return () => {
      clearTimeout(searchTimer);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  },
};