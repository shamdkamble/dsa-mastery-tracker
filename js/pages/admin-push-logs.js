import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, EmptyState, SkeletonTable } from "../components/ui/index.js";
import { adminSubnav, adminHero, adminStatCard } from "../components/admin-shell.js";
import {
  renderDailyWisdomPanelShell,
  renderActivityList,
  renderMetrics,
  renderConsoleStatus,
  renderPreviewText,
} from "../components/daily-wisdom-admin-panel.js";
import {
  getPushDeliveryLogs,
  seedLearningFacts,
  getDailyWisdomDashboard,
  generateLearningFactsBatch,
  deliverLearningFactToMe,
  deliverLearningFactToUser,
  runDailyWisdomCronNow,
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
    "learning-fact": "Daily Wisdom",
  };
  return Badge({
    label: labels[source] || source,
    variant: "default",
    size: "sm",
  });
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
      iconName: "bell",
      hideHeader: true,
      children: `
        <div class="admin-page admin-page--modern push-logs">
          ${adminHero({
            title: "Push Delivery Log",
            description: "Delivery audit, Daily Wisdom, and manual cron.",
            badge: "Notifications",
          })}
          ${adminSubnav("push-logs")}

          ${renderDailyWisdomPanelShell()}

          <div class="admin-stats push-logs__stats" id="push-logs-stats">
            ${adminStatCard({ iconName: "bell", value: "—", label: "Total attempts" })}
            ${adminStatCard({ iconName: "check", value: "—", label: "Delivered", variant: "success" })}
            ${adminStatCard({ iconName: "close", value: "—", label: "Failed", variant: "danger" })}
            ${adminStatCard({ iconName: "alertCircle", value: "—", label: "Skipped", variant: "warning" })}
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

    const dwMetrics = container.querySelector("#dw-console-metrics");
    const dwStatus = container.querySelector("#dw-console-status");
    const dwActivity = container.querySelector("#dw-activity-list");
    const dwPreview = container.querySelector("#dw-preview .dw-console__preview-text");
    const generateMissingBtn = container.querySelector("#dw-generate-missing");
    const sendTestBtn = container.querySelector("#dw-send-test");
    const cronRunBtn = container.querySelector("#dw-run-cron");
    const refreshActivityBtn = container.querySelector("#dw-refresh-activity");
    const sendStudentBtn = container.querySelector("#dw-send-student");
    const studentIdInput = container.querySelector("#dw-student-id");
    const seedPilotBtn = container.querySelector("#dw-seed-pilot");
    const regenerateAllBtn = container.querySelector("#dw-regenerate-all");

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

    function applyDashboard(dashboard) {
      if (dwMetrics) dwMetrics.innerHTML = renderMetrics(dashboard);
      if (dwStatus) dwStatus.innerHTML = renderConsoleStatus(dashboard);
      if (dwActivity) dwActivity.innerHTML = renderActivityList(dashboard?.recentActivity);
      if (dwPreview) dwPreview.innerHTML = renderPreviewText(dashboard?.preview);
    }

    async function loadDashboard() {
      try {
        const dashboard = await getDailyWisdomDashboard();
        applyDashboard(dashboard);
        return dashboard;
      } catch {
        if (dwStatus) dwStatus.innerHTML = `<span class="dw-console__live-dot dw-console__live-dot--warn"></span><span>Stats unavailable</span>`;
        if (dwActivity) {
          dwActivity.innerHTML = `<p class="dw-console__activity-empty text-tertiary">Could not load activity.</p>`;
        }
        return null;
      }
    }

    async function runGenerateBatch(btn, { replaceExisting = false } = {}) {
      if (!btn) return;
      btn.disabled = true;
      const labelEl = btn.querySelector("span");
      const originalLabel = labelEl?.textContent;

      try {
        let remaining = 1;
        let totalProcessed = 0;

        while (remaining > 0) {
          if (labelEl) labelEl.textContent = `Generating… (${totalProcessed} topics)`;

          const data = await generateLearningFactsBatch({ limit: 6, replaceExisting });
          const batch = data.result;
          totalProcessed += batch.succeeded || 0;
          remaining = batch.remaining ?? 0;

          if (batch.failed > 0 && batch.succeeded === 0) {
            throw new AuthApiError(batch.errors?.[0]?.message || "AI generation failed.", {
              status: 502,
              details: batch,
            });
          }

          if (remaining > 0) {
            await new Promise((r) => { setTimeout(r, 800); });
          }
        }

        showToast(Toast({
          title: replaceExisting ? "All hooks regenerated" : "Missing hooks generated",
          text: "Mantra Feed is up to date for all roadmap topics.",
          variant: "success",
        }));
        void loadDashboard();
      } catch (err) {
        showToast(Toast({
          title: "Generation stopped",
          text: err instanceof AuthApiError ? err.message : "Could not finish generating hooks.",
          variant: "danger",
        }));
        void loadDashboard();
      } finally {
        if (labelEl && originalLabel) labelEl.textContent = originalLabel;
        btn.disabled = false;
      }
    }

    generateMissingBtn?.addEventListener("click", () => {
      void runGenerateBatch(generateMissingBtn, { replaceExisting: false });
    });

    regenerateAllBtn?.addEventListener("click", () => {
      if (!confirm("Regenerate hooks for ALL topics? This replaces existing Mantra Feed content.")) return;
      void runGenerateBatch(regenerateAllBtn, { replaceExisting: true });
    });

    refreshActivityBtn?.addEventListener("click", () => { void loadDashboard(); });

    cronRunBtn?.addEventListener("click", async () => {
      cronRunBtn.disabled = true;
      try {
        const data = await runDailyWisdomCronNow({ force: true, skipTimezone: true });
        const r = data.result || {};
        const summary = `Sent ${r.sent ?? 0} · checked ${r.checked ?? 0} · skipped ${r.skipped ?? 0}`;

        showToast(Toast({
          title: "Daily cron finished",
          text: summary,
          variant: (r.sent ?? 0) > 0 ? "success" : "warning",
        }));
        void loadLogs();
        void loadDashboard();
      } catch (err) {
        showToast(Toast({
          title: "Cron failed",
          text: err instanceof AuthApiError ? err.message : "Cron run failed.",
          variant: "danger",
        }));
      } finally {
        cronRunBtn.disabled = false;
      }
    });

    function formatDeliverResult(data) {
      const push = data.pushDelivery;
      if (push?.sent > 0) return "System push sent.";
      if (push?.skipped) return `No system push (${push.reason || "skipped"}). In-app bell still created.`;
      if (push?.failed > 0) return "Push failed — check delivery log below.";
      return "In-app notification created.";
    }

    function formatDeliverError(err, data) {
      if (data?.reason === "no_facts") {
        return "No hooks for this user's next topic. Click Generate Mantra Feed (AI) first.";
      }
      if (data?.reason === "already_delivered") {
        return "This user already received all Daily Wisdom hooks for their current topic.";
      }
      if (data?.reason === "no_anchor") {
        return "Could not determine this user's current roadmap topic.";
      }
      return err instanceof AuthApiError ? err.message : "Delivery failed.";
    }

    sendTestBtn?.addEventListener("click", async () => {
      sendTestBtn.disabled = true;
      try {
        const data = await deliverLearningFactToMe({ sendPush: true });
        showToast(Toast({
          title: "Test sent",
          text: `${data.message?.title || "Daily Wisdom"} — ${formatDeliverResult(data)}`,
          variant: "success",
        }));
        void loadLogs();
        void loadDashboard();
      } catch (err) {
        const details = err instanceof AuthApiError ? err.details : null;
        showToast(Toast({
          title: "Test failed",
          text: formatDeliverError(err, details),
          variant: "danger",
        }));
      } finally {
        sendTestBtn.disabled = false;
      }
    });

    sendStudentBtn?.addEventListener("click", async () => {
      const userId = studentIdInput?.value?.trim();
      if (!userId) {
        showToast(Toast({
          title: "Enter a user ID",
          text: "Copy a student's userId from User Management.",
          variant: "warning",
        }));
        return;
      }

      sendStudentBtn.disabled = true;
      try {
        const data = await deliverLearningFactToUser(userId, { sendPush: true });
        showToast(Toast({
          title: "Sent to student",
          text: `${data.message?.title || "Daily Wisdom"} — ${formatDeliverResult(data)}`,
          variant: "success",
        }));
        void loadLogs();
        void loadDashboard();
      } catch (err) {
        const details = err instanceof AuthApiError ? err.details : null;
        showToast(Toast({
          title: "Send failed",
          text: formatDeliverError(err, details),
          variant: "danger",
        }));
      } finally {
        sendStudentBtn.disabled = false;
      }
    });

    seedPilotBtn?.addEventListener("click", async () => {
      seedPilotBtn.disabled = true;
      try {
        const data = await seedLearningFacts();
        showToast(Toast({
          title: "Pilot hooks seeded",
          text: `${data.result?.total ?? 0} hooks across ${data.result?.topicIds?.length ?? 0} topics.`,
          variant: "success",
        }));
        void loadDashboard();
      } catch (err) {
        showToast(Toast({
          title: "Seed failed",
          text: err instanceof AuthApiError ? err.message : "Could not seed pilot hooks.",
          variant: "danger",
        }));
      } finally {
        seedPilotBtn.disabled = false;
      }
    });

    void loadDashboard();

    refreshTimer = window.setInterval(() => { void loadLogs(); }, 30000);

    void loadLogs();

    return () => {
      clearTimeout(searchTimer);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  },
};