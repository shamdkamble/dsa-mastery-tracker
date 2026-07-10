import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, EmptyState, SkeletonTable } from "../components/ui/index.js";
import { adminSubnav, adminHero, adminStatCard } from "../components/admin-shell.js";
import {
  getPushDeliveryLogs,
  seedLearningFacts,
  getLearningFactsPoolStats,
  generateLearningFactsBatch,
  deliverLearningFactToMe,
  deliverLearningFactToUser,
  previewLearningFactAnchor,
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

          <section class="card admin-wisdom-panel learning-facts-guide">
            <div class="card__body learning-facts-guide__body">
              <div>
                <span class="admin-wisdom-panel__badge">${icon("zap")}<span>Daily Wisdom</span></span>
                <h2 class="admin-wisdom-panel__title">Mantra Feed</h2>
                <ol class="learning-facts-guide__steps">
                  <li><strong>Generate Mantra Feed (AI)</strong> — builds 5 value-first hooks per topic (insight, common mistake, interview tip).</li>
                  <li><strong>Send Daily Wisdom</strong> — picks the student's next topic and personalizes with progress: streak, last completed topic, tone.</li>
                  <li><strong>Student taps</strong> — opens that topic's lesson on the roadmap.</li>
                </ol>
                <p class="learning-facts-guide__pool text-secondary" id="learning-facts-pool-stats">Mantra Feed: loading…</p>
                <p class="learning-facts-guide__anchor text-tertiary" id="learning-facts-anchor-preview">Preview: loading…</p>
              </div>
              <div class="learning-facts-guide__actions">
                <button type="button" class="btn btn--primary btn--sm" id="learning-facts-generate-all">
                  ${icon("zap")}
                  <span>Generate Mantra Feed (AI)</span>
                </button>
                <button type="button" class="btn btn--ghost btn--sm" id="learning-facts-send-me">
                  ${icon("bell")}
                  <span>Send Daily Wisdom to me</span>
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
                <div class="admin-wisdom-panel__cron">
                  <button type="button" class="btn btn--secondary btn--sm" id="daily-wisdom-cron-run">
                    ${icon("repeat")}
                    <span>Run Daily Wisdom cron now</span>
                  </button>
                  <span class="admin-wisdom-panel__cron-hint" id="daily-wisdom-cron-result">
                    Simulates the daily job for all subscribed students (bypasses timezone &amp; daily dedup).
                  </span>
                </div>
              </div>
            </div>
          </section>

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
                <button class="btn btn--ghost btn--sm" type="button" id="push-logs-seed-facts" title="Seed pilot Daily Wisdom hooks into MongoDB">
                  ${icon("database")}
                  <span>Seed pilot</span>
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
    const generateAllBtn = container.querySelector("#learning-facts-generate-all");
    const poolStatsEl = container.querySelector("#learning-facts-pool-stats");
    const sendMeBtn = container.querySelector("#learning-facts-send-me");
    const sendUserBtn = container.querySelector("#learning-facts-send-user");
    const userIdInput = container.querySelector("#learning-facts-user-id");
    const anchorPreview = container.querySelector("#learning-facts-anchor-preview");
    const cronRunBtn = container.querySelector("#daily-wisdom-cron-run");
    const cronResultEl = container.querySelector("#daily-wisdom-cron-result");
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

    async function loadPoolStats() {
      if (!poolStatsEl) return;
      try {
        const stats = await getLearningFactsPoolStats();
        poolStatsEl.textContent = `Mantra Feed: ${stats.topicsWithFacts}/${stats.totalTopics} topics · ${stats.totalActiveFacts} hooks (${stats.factsPerTopicTarget}/topic target) · ${stats.topicsMissingFacts} topics need generation`;
      } catch {
        poolStatsEl.textContent = "Mantra Feed: could not load stats";
      }
    }

    async function loadAnchorPreview() {
      if (!anchorPreview) return;
      try {
        const data = await previewLearningFactAnchor();
        if (!data.anchor) {
          anchorPreview.textContent = "Preview: no next topic (all complete or locked)";
          return;
        }
        const ctx = data.context;
        const ctxBits = [];
        if (ctx?.lastCompleted?.topicName) ctxBits.push(`after ${ctx.lastCompleted.topicName}`);
        if (ctx?.streak >= 2) ctxBits.push(`${ctx.streak}-day streak`);
        if (ctx?.tone) ctxBits.push(`${ctx.tone} tone`);
        const ctxLabel = ctxBits.length ? ` (${ctxBits.join(" · ")})` : "";

        if (data.previewMessage) {
          anchorPreview.textContent = `Preview for ${data.anchor.topicName}${ctxLabel}: "${data.previewMessage.title} — ${data.previewMessage.body}"`;
          return;
        }
        anchorPreview.textContent = `Next topic: ${data.anchor.topicName}${ctxLabel} — no unused hooks yet (generate Mantra Feed)`;
      } catch {
        anchorPreview.textContent = "Preview: could not load";
      }
    }

    async function runGenerateAllFacts() {
      if (!generateAllBtn) return;
      generateAllBtn.disabled = true;
      const originalLabel = generateAllBtn.querySelector("span")?.textContent;

      try {
        let remaining = 1;
        let totalProcessed = 0;

        while (remaining > 0) {
          if (generateAllBtn.querySelector("span")) {
            generateAllBtn.querySelector("span").textContent = `Generating… (${totalProcessed} done)`;
          }

          const data = await generateLearningFactsBatch({ limit: 6, replaceExisting: true });
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
          title: "Mantra Feed complete",
          text: "Daily Wisdom hooks are ready for every roadmap topic.",
          variant: "success",
        }));
        void loadPoolStats();
        void loadAnchorPreview();
      } catch (err) {
        showToast(Toast({
          title: "Generation stopped",
          text: err instanceof AuthApiError ? err.message : "Could not finish generating all facts.",
          variant: "danger",
        }));
        void loadPoolStats();
      } finally {
        if (generateAllBtn.querySelector("span") && originalLabel) {
          generateAllBtn.querySelector("span").textContent = originalLabel;
        }
        generateAllBtn.disabled = false;
      }
    }

    generateAllBtn?.addEventListener("click", () => { void runGenerateAllFacts(); });

    cronRunBtn?.addEventListener("click", async () => {
      cronRunBtn.disabled = true;
      if (cronResultEl) cronResultEl.textContent = "Running cron for all eligible students…";

      try {
        const data = await runDailyWisdomCronNow({ force: true, skipTimezone: true });
        const r = data.result || {};
        const summary = `Done — sent: ${r.sent ?? 0}, checked: ${r.checked ?? 0}, skipped: ${r.skipped ?? 0}, failed: ${r.failed ?? 0}`;
        if (cronResultEl) cronResultEl.textContent = summary;

        showToast(Toast({
          title: "Daily Wisdom cron finished",
          text: summary,
          variant: (r.sent ?? 0) > 0 ? "success" : "warning",
        }));
        void loadLogs();
      } catch (err) {
        const message = err instanceof AuthApiError ? err.message : "Cron run failed.";
        if (cronResultEl) cronResultEl.textContent = message;
        showToast(Toast({
          title: "Cron failed",
          text: message,
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

    sendMeBtn?.addEventListener("click", async () => {
      sendMeBtn.disabled = true;
      try {
        const data = await deliverLearningFactToMe({ sendPush: true });
        showToast(Toast({
          title: "Daily Wisdom sent",
          text: `${data.message?.title || data.fact?.title || "Wisdom"} — ${formatDeliverResult(data)}`,
          variant: "success",
        }));
        void loadLogs();
        void loadAnchorPreview();
      } catch (err) {
        const details = err instanceof AuthApiError ? err.details : null;
        showToast(Toast({
          title: "Could not send Daily Wisdom",
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
          title: "Daily Wisdom sent",
          text: `${data.message?.title || data.fact?.title || "Wisdom"} — ${formatDeliverResult(data)}`,
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

    void loadPoolStats();
    void loadAnchorPreview();

    seedFactsBtn?.addEventListener("click", async () => {
      seedFactsBtn.disabled = true;
      try {
        const data = await seedLearningFacts();
        showToast(Toast({
          title: "Pilot Mantra Feed seeded",
          text: `${data.result?.total ?? 0} hooks across ${data.result?.topicIds?.length ?? 0} topics.`,
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