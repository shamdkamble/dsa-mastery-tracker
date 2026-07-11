import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { adminSubnav, adminHero, adminStatCard, adminQuickCard } from "../components/admin-shell.js";
import { Badge, Button, EmptyState, Alert, SkeletonTable, Toast } from "../components/ui/index.js";
import { initDropdowns, showToast } from "../components/ui/interactions.js";
import {
  getAllUsers,
  adminUserAction,
  updateUserAdmin,
  AuthApiError,
} from "../services/auth.js";
import {
  apiListUserDataArchives,
  apiRestoreUserStudyData,
  UserDataApiError,
} from "../api/userDataApi.js";

const ACCESS_LEVELS = ["standard", "premium", "trial"];
const USER_ROLES = ["user", "tester", "admin"];
const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "suspended"];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso, { dateOnly = false } = {}) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }),
  });
}

function toDateInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function statusBadge(status) {
  const map = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    suspended: "info",
  };
  return Badge({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    variant: map[status] || "default",
    size: "sm",
  });
}

function accessBadge(level) {
  const map = {
    standard: "default",
    premium: "accent",
    trial: "warning",
  };
  return Badge({
    label: level.charAt(0).toUpperCase() + level.slice(1),
    variant: map[level] || "default",
    size: "sm",
  });
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function isActionDisabled(action, status) {
  return (action === "approve" && status === "approved")
    || (action === "reject" && status === "rejected")
    || (action === "suspend" && status === "suspended")
    || (action === "activate" && status === "approved");
}

function actionButton(action, user, { label, variant = "ghost", danger = false }) {
  const disabled = isActionDisabled(action, user.status);
  const extraClass = danger ? " btn--danger-text" : "";

  return Button({
    label,
    variant,
    size: "sm",
    disabled,
    className: extraClass.trim(),
    attrs: `data-action="${action}" data-user-id="${user.id}" title="${label}"`,
  });
}

function primaryActions(user) {
  const byStatus = {
    pending: [
      { action: "approve", label: "Approve", variant: "primary" },
      { action: "reject", label: "Reject" },
    ],
    approved: [{ action: "suspend", label: "Suspend" }],
    suspended: [{ action: "activate", label: "Activate", variant: "primary" }],
    rejected: [
      { action: "approve", label: "Approve", variant: "primary" },
      { action: "activate", label: "Re-activate" },
    ],
  };

  return (byStatus[user.status] || []).map((cfg) => actionButton(cfg.action, user, cfg)).join("");
}

function overflowMenu(user) {
  const primaryIds = new Set({
    pending: ["approve", "reject"],
    approved: ["suspend"],
    suspended: ["activate"],
    rejected: ["approve", "activate"],
  }[user.status] || []);

  const items = [
    { action: "approve", label: "Approve" },
    { action: "reject", label: "Reject" },
    { action: "suspend", label: "Suspend" },
    { action: "activate", label: "Activate" },
    { action: "restore-data", label: "Restore study data" },
    { action: "delete", label: "Delete", danger: true },
  ].filter((item) => item.action === "delete" || item.action === "restore-data"
    || (!primaryIds.has(item.action) && !isActionDisabled(item.action, user.status)));

  const menuItems = items.map((item) => `
    <button
      type="button"
      class="dropdown__item${item.danger ? " dropdown__item--danger" : ""}"
      data-action="${item.action}"
      data-user-id="${user.id}"
    >
      <span>${item.label}</span>
    </button>
  `).join("");

  return `
    <div class="dropdown user-mgmt__menu">
      <div class="dropdown__trigger">
        ${Button({ label: "More", variant: "ghost", size: "sm", iconRight: icon("chevronDown") })}
      </div>
      <div class="dropdown__menu" role="menu">${menuItems}</div>
    </div>
  `;
}

function userRow(user) {
  const expired = isExpired(user.expiresAt);

  return `
    <tr class="user-mgmt__row" data-user-id="${user.id}" data-status="${user.status}">
      <td data-label="Name">
        <div class="admin-user">
          <div class="admin-user__avatar" aria-hidden="true">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
          <div>
            <div class="admin-user__name">${escapeHtml(user.name)}</div>
          </div>
        </div>
      </td>
      <td class="user-mgmt__email" data-label="Email">${escapeHtml(user.email)}</td>
      <td data-label="Status">${statusBadge(user.status)}</td>
      <td class="text-tertiary user-mgmt__date" data-label="Registered">${formatDate(user.createdAt, { dateOnly: true })}</td>
      <td class="user-mgmt__expiry" data-label="Expiry">
        <div class="user-mgmt__date-field">
          <input
            type="date"
            class="input input--sm user-mgmt__date-input"
            data-field="expiresAt"
            data-user-id="${user.id}"
            value="${toDateInputValue(user.expiresAt)}"
            aria-label="Expiry date for ${escapeHtml(user.name)}"
          />
          <button
            type="button"
            class="user-mgmt__date-trigger btn btn--ghost btn--sm"
            data-date-trigger
            data-user-id="${user.id}"
            aria-label="Open calendar for ${escapeHtml(user.name)}"
            title="Pick expiry date"
          >
            ${icon("calendar")}
          </button>
        </div>
        ${expired ? `<span class="user-mgmt__expired-tag">Expired</span>` : ""}
      </td>
      <td data-label="Role">
        <select class="input input--sm user-mgmt__level-select" data-field="role" data-user-id="${user.id}" aria-label="Role for ${escapeHtml(user.name)}"${user.id === "admin" ? " disabled" : ""}>
          ${USER_ROLES.map((role) => `
            <option value="${role}"${user.role === role ? " selected" : ""}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>
          `).join("")}
        </select>
      </td>
      <td data-label="Access">
        <select class="input input--sm user-mgmt__level-select" data-field="accessLevel" data-user-id="${user.id}" aria-label="Access level for ${escapeHtml(user.name)}">
          ${ACCESS_LEVELS.map((level) => `
            <option value="${level}"${user.accessLevel === level ? " selected" : ""}>${level.charAt(0).toUpperCase() + level.slice(1)}</option>
          `).join("")}
        </select>
      </td>
      <td data-label="Actions">
        <div class="user-mgmt__actions">
          ${primaryActions(user)}
          ${overflowMenu(user)}
          <button
            type="button"
            class="btn btn--ghost btn--sm user-mgmt__save"
            data-action="save"
            data-user-id="${user.id}"
            data-access="${user.accessLevel}"
            data-role="${user.role || "user"}"
            data-expires="${toDateInputValue(user.expiresAt)}"
            title="Save access & expiry"
            disabled
          >
            ${icon("check")}
            <span>Save</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderTable(users, { search, statusFilter }) {
  const q = search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesSearch = !q
      || user.name.toLowerCase().includes(q)
      || user.email.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  if (!filtered.length) {
    return EmptyState({
      iconName: "user",
      title: "No users found",
      text: q || statusFilter !== "all"
        ? "Try adjusting your search or filter."
        : "Registered users will appear here.",
    });
  }

  return `
    <div class="user-mgmt__table-wrap">
      <table class="table user-mgmt__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Registered</th>
            <th>Expiry</th>
            <th>Role</th>
            <th>Access</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(userRow).join("")}
        </tbody>
      </table>
      <p class="user-mgmt__count text-tertiary">Showing ${filtered.length} of ${users.length} users</p>
    </div>
  `;
}

export default {
  title: "Admin Panel",
  adminOnly: true,
  render() {
    return createPage({
      title: "User Management",
      iconName: "shield",
      hideHeader: true,
      children: `
        <div class="admin-page admin-page--modern user-mgmt">
          ${adminHero({
            title: "User Management",
            badge: "Control center",
          })}
          ${adminSubnav("users")}

          <div class="admin-quick-grid">
            ${adminQuickCard({
              path: "admin-topic-videos",
              iconName: "video",
              title: "Topic Videos",
              text: "Attach YouTube walkthroughs to roadmap topics for the Learn dialog.",
              accent: "success",
            })}
            ${adminQuickCard({
              path: "admin-push-logs",
              iconName: "bell",
              title: "Push Delivery Log",
              text: "Daily Wisdom, delivery audit trail, and manual cron trigger.",
              accent: "accent",
            })}
            ${adminQuickCard({
              path: "admin-notifications",
              iconName: "layers",
              title: "System Architecture",
              text: "Expandable map of every platform domain with live diagrams and metrics.",
              accent: "violet",
            })}
          </div>

          <div id="admin-alert" class="admin-page__alert"></div>

          <div class="admin-stats user-mgmt__stats" id="admin-stats">
            ${adminStatCard({ iconName: "user", value: "—", label: "Total users" })}
            ${adminStatCard({ iconName: "clock", value: "—", label: "Pending", variant: "warning" })}
            ${adminStatCard({ iconName: "check", value: "—", label: "Approved", variant: "success" })}
            ${adminStatCard({ iconName: "alertCircle", value: "—", label: "Suspended", variant: "info" })}
          </div>

          <section class="admin-section user-mgmt__panel">
            <div class="user-mgmt__toolbar">
              <div class="user-mgmt__search">
                <span class="user-mgmt__search-icon" aria-hidden="true">${icon("search")}</span>
                <input
                  type="search"
                  class="input user-mgmt__search-input"
                  id="admin-search"
                  placeholder="Search by name or email…"
                  autocomplete="off"
                />
              </div>
              <div class="user-mgmt__filters">
                <label class="user-mgmt__filter-label" for="admin-status-filter">Status</label>
                <select class="input input--sm" id="admin-status-filter">
                  ${STATUS_FILTERS.map((s) => `
                    <option value="${s}">${s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  `).join("")}
                </select>
                <button class="btn btn--ghost btn--sm" type="button" id="admin-refresh">
                  ${icon("repeat")}
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div id="admin-users-container" class="user-mgmt__content">
              ${SkeletonTable({ rows: 6, cols: 7 })}
            </div>
          </section>
        </div>
      `,
    });
  },
  onMount(container) {
    const alertEl = container.querySelector("#admin-alert");
    const listEl = container.querySelector("#admin-users-container");
    const statsEl = container.querySelector("#admin-stats");
    const searchInput = container.querySelector("#admin-search");
    const statusFilter = container.querySelector("#admin-status-filter");
    const refreshBtn = container.querySelector("#admin-refresh");

    let allUsers = [];
    let search = "";
    let filter = "all";

    function updateStats(users) {
      const counts = {
        total: users.length,
        pending: users.filter((u) => u.status === "pending").length,
        approved: users.filter((u) => u.status === "approved").length,
        suspended: users.filter((u) => u.status === "suspended").length,
      };

      statsEl.innerHTML = `
        ${adminStatCard({ iconName: "user", value: counts.total, label: "Total users" })}
        ${adminStatCard({ iconName: "clock", value: counts.pending, label: "Pending", variant: "warning" })}
        ${adminStatCard({ iconName: "check", value: counts.approved, label: "Approved", variant: "success" })}
        ${adminStatCard({ iconName: "alertCircle", value: counts.suspended, label: "Suspended", variant: "info" })}
      `;
    }

    function markRowDirty(row) {
      if (!row) return;
      const saveBtn = row.querySelector('[data-action="save"]');
      const accessEl = row.querySelector('[data-field="accessLevel"]');
      const roleEl = row.querySelector('[data-field="role"]');
      const expiryEl = row.querySelector('[data-field="expiresAt"]');
      if (!saveBtn || !accessEl || !expiryEl) return;

      const dirty = accessEl.value !== saveBtn.dataset.access
        || (roleEl && roleEl.value !== saveBtn.dataset.role)
        || expiryEl.value !== saveBtn.dataset.expires;

      saveBtn.disabled = !dirty;
      saveBtn.classList.toggle("user-mgmt__save--dirty", dirty);
      row.classList.toggle("user-mgmt__row--dirty", dirty);
    }

    function openDatePicker(input) {
      if (!input) return;
      input.focus();
      if (typeof input.showPicker === "function") {
        try {
          input.showPicker();
          return;
        } catch {
          /* fallback to native click */
        }
      }
      input.click();
    }

    function bindRowEditors() {
      listEl.querySelectorAll(".user-mgmt__row").forEach((row) => {
        row.querySelectorAll("[data-field]").forEach((field) => {
          field.addEventListener("change", () => markRowDirty(row));
          field.addEventListener("input", () => markRowDirty(row));

          if (field.matches('[data-field="expiresAt"]')) {
            ["click", "mousedown", "pointerdown"].forEach((evt) => {
              field.addEventListener(evt, (e) => e.stopPropagation());
            });
            field.addEventListener("click", () => openDatePicker(field));
          }
        });
      });
      initDropdowns(listEl);
    }

    function renderList() {
      listEl.innerHTML = renderTable(allUsers, { search, statusFilter: filter });
      bindRowEditors();
    }

    async function refreshUsers({ showLoading = false } = {}) {
      if (showLoading) {
        listEl.innerHTML = SkeletonTable({ rows: 6, cols: 7 });
      }

      try {
        allUsers = await getAllUsers();
        updateStats(allUsers);
        renderList();
      } catch (err) {
        const message = err instanceof AuthApiError ? err.message : "Failed to load users.";
        listEl.innerHTML = "";
        alertEl.innerHTML = Alert({ variant: "danger", title: "Error", text: message, dismissible: true });
      }
    }

    async function loadUsers() {
      alertEl.innerHTML = "";
      await refreshUsers({ showLoading: true });
    }

    function pushDeliveryHint(pushDelivery) {
      if (!pushDelivery) return "";
      if (pushDelivery.delivered) return " System notification sent to their device.";
      if (pushDelivery.reason === "no_subscriptions") {
        return " No push subscription — user must enable System notifications in Settings.";
      }
      if (pushDelivery.reason === "no_push_attempt") return "";
      return " In-app notification saved; system push was not delivered.";
    }

    function notify(variant, title, text) {
      showToast(Toast({ variant, title, text }));
    }

    async function handleRestoreStudyData(userId) {
      const row = listEl.querySelector(`tr[data-user-id="${userId}"]`);
      const user = allUsers.find((u) => u.id === userId);
      row?.classList.add("is-processing");

      try {
        const { archives } = await apiListUserDataArchives(userId);
        const restorable = (archives || []).filter((a) => !a.restoredAt);
        if (!restorable.length) {
          notify("info", "No archive", `${user?.name || "This user"} has no restorable study data.`);
          row?.classList.remove("is-processing");
          return;
        }

        const latest = restorable[0];
        const stats = latest.stats || {};
        const summary = [
          stats.problemCount ? `${stats.problemCount} problems` : null,
          stats.activityCount ? `${stats.activityCount} activities` : null,
          stats.noteCount ? `${stats.noteCount} notes` : null,
        ].filter(Boolean).join(", ") || "saved study data";

        if (!confirm(
          `Restore study data for ${user?.name || "this user"}?\n\n`
          + `Latest backup from ${formatDate(latest.archivedAt)} (${summary}) will replace their current progress.`,
        )) {
          row?.classList.remove("is-processing");
          return;
        }

        const result = await apiRestoreUserStudyData(userId, { archiveId: latest.id });
        const restored = result.restored || {};
        notify(
          "success",
          "Study data restored",
          `Restored ${restored.problems ?? 0} problems and ${restored.activities ?? 0} activities for ${user?.name || "user"}.`,
        );
      } catch (err) {
        const message = err instanceof UserDataApiError || err instanceof AuthApiError
          ? err.message
          : "Restore failed.";
        notify("danger", "Error", message);
      } finally {
        row?.classList.remove("is-processing");
      }
    }

    async function handleAction(userId, action) {
      const row = listEl.querySelector(`tr[data-user-id="${userId}"]`);
      row?.classList.add("is-processing");

      if (action === "restore-data") {
        row?.classList.remove("is-processing");
        await handleRestoreStudyData(userId);
        return;
      }

      if (action === "delete") {
        const user = allUsers.find((u) => u.id === userId);
        if (!confirm(`Delete ${user?.name || "this user"}? This cannot be undone.`)) {
          row?.classList.remove("is-processing");
          return;
        }
      }

      try {
        const result = await adminUserAction(userId, action);
        const labels = {
          approve: ["success", "Approved", "User can sign in."],
          reject: ["warning", "Rejected", "Registration rejected."],
          suspend: ["info", "Suspended", "User access suspended."],
          activate: ["success", "Activated", "User reactivated."],
          delete: ["warning", "Deleted", "User removed."],
        };
        const [variant, title, text] = labels[action] || ["success", "Done", "Action completed."];
        notify(variant, title, `${text}${pushDeliveryHint(result.pushDelivery)}`);
        await refreshUsers();
      } catch (err) {
        const message = err instanceof AuthApiError ? err.message : "Action failed.";
        notify("danger", "Error", message);
        row?.classList.remove("is-processing");
      }
    }

    async function handleSave(userId) {
      const row = listEl.querySelector(`tr[data-user-id="${userId}"]`);
      row?.classList.add("is-processing");

      const accessLevel = row?.querySelector('[data-field="accessLevel"]')?.value;
      const role = row?.querySelector('[data-field="role"]')?.value;
      const expiresAtRaw = row?.querySelector('[data-field="expiresAt"]')?.value;

      try {
        const result = await updateUserAdmin(userId, {
          accessLevel,
          role,
          expiresAt: expiresAtRaw || null,
        });
        notify("success", "Saved", `User settings updated.${pushDeliveryHint(result.pushDelivery)}`);
        await refreshUsers();
      } catch (err) {
        const message = err instanceof AuthApiError ? err.message : "Save failed.";
        notify("danger", "Error", message);
        row?.classList.remove("is-processing");
      }
    }

    searchInput?.addEventListener("input", (e) => {
      search = e.target.value;
      renderList();
    });

    statusFilter?.addEventListener("change", (e) => {
      filter = e.target.value;
      renderList();
    });

    refreshBtn?.addEventListener("click", loadUsers);

    listEl?.addEventListener("click", (e) => {
      const dateTrigger = e.target.closest("[data-date-trigger]");
      if (dateTrigger) {
        e.preventDefault();
        e.stopPropagation();
        const row = dateTrigger.closest("tr");
        const input = row?.querySelector('[data-field="expiresAt"]');
        openDatePicker(input);
        return;
      }

      const btn = e.target.closest("[data-action]");
      if (!btn || btn.disabled) return;

      const userId = btn.dataset.userId;
      const action = btn.dataset.action;
      if (!userId || !action) return;

      e.target.closest(".dropdown")?.classList.remove("is-open");

      if (action === "save") {
        handleSave(userId);
      } else {
        handleAction(userId, action);
      }
    });

    loadUsers();
  },
};