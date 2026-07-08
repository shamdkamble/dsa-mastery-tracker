import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, Button, EmptyState, Alert, SkeletonTable, Toast } from "../components/ui/index.js";
import { initDropdowns, showToast } from "../components/ui/interactions.js";
import {
  getAllUsers,
  adminUserAction,
  updateUserAdmin,
  AuthApiError,
} from "../services/auth.js";

const ACCESS_LEVELS = ["standard", "premium", "trial"];
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
    { action: "delete", label: "Delete", danger: true },
  ].filter((item) => item.action === "delete"
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
      <td>
        <div class="admin-user">
          <div class="admin-user__avatar" aria-hidden="true">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
          <div>
            <div class="admin-user__name">${escapeHtml(user.name)}</div>
          </div>
        </div>
      </td>
      <td class="user-mgmt__email">${escapeHtml(user.email)}</td>
      <td>${statusBadge(user.status)}</td>
      <td class="text-tertiary user-mgmt__date">${formatDate(user.createdAt, { dateOnly: true })}</td>
      <td class="user-mgmt__expiry">
        <input
          type="date"
          class="input input--sm user-mgmt__date-input"
          data-field="expiresAt"
          data-user-id="${user.id}"
          value="${toDateInputValue(user.expiresAt)}"
          aria-label="Expiry date for ${escapeHtml(user.name)}"
        />
        ${expired ? `<span class="user-mgmt__expired-tag">Expired</span>` : ""}
      </td>
      <td>
        <select class="input input--sm user-mgmt__level-select" data-field="accessLevel" data-user-id="${user.id}" aria-label="Access level for ${escapeHtml(user.name)}">
          ${ACCESS_LEVELS.map((level) => `
            <option value="${level}"${user.accessLevel === level ? " selected" : ""}>${level.charAt(0).toUpperCase() + level.slice(1)}</option>
          `).join("")}
        </select>
      </td>
      <td>
        <div class="user-mgmt__actions">
          ${primaryActions(user)}
          ${overflowMenu(user)}
          <button
            type="button"
            class="btn btn--ghost btn--sm user-mgmt__save"
            data-action="save"
            data-user-id="${user.id}"
            data-access="${user.accessLevel}"
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
      <table class="table table--interactive user-mgmt__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Registered</th>
            <th>Expiry</th>
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
      description: "Manage learner accounts, access levels, and expiry dates from one place.",
      iconName: "shield",
      children: `
        <div class="admin-page user-mgmt">
          <div id="admin-alert" class="admin-page__alert"></div>

          <div class="admin-stats user-mgmt__stats" id="admin-stats">
            ${statCard({ iconName: "user", value: "—", label: "Total users" })}
            ${statCard({ iconName: "clock", value: "—", label: "Pending", variant: "warning" })}
            ${statCard({ iconName: "check", value: "—", label: "Approved", variant: "success" })}
            ${statCard({ iconName: "alertCircle", value: "—", label: "Suspended", variant: "info" })}
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
        ${statCard({ iconName: "user", value: counts.total, label: "Total users" })}
        ${statCard({ iconName: "clock", value: counts.pending, label: "Pending", variant: "warning" })}
        ${statCard({ iconName: "check", value: counts.approved, label: "Approved", variant: "success" })}
        ${statCard({ iconName: "alertCircle", value: counts.suspended, label: "Suspended", variant: "info" })}
      `;
    }

    function markRowDirty(row) {
      if (!row) return;
      const saveBtn = row.querySelector('[data-action="save"]');
      const accessEl = row.querySelector('[data-field="accessLevel"]');
      const expiryEl = row.querySelector('[data-field="expiresAt"]');
      if (!saveBtn || !accessEl || !expiryEl) return;

      const dirty = accessEl.value !== saveBtn.dataset.access
        || expiryEl.value !== saveBtn.dataset.expires;

      saveBtn.disabled = !dirty;
      saveBtn.classList.toggle("user-mgmt__save--dirty", dirty);
      row.classList.toggle("user-mgmt__row--dirty", dirty);
    }

    function bindRowEditors() {
      listEl.querySelectorAll(".user-mgmt__row").forEach((row) => {
        row.querySelectorAll("[data-field]").forEach((field) => {
          field.addEventListener("change", () => markRowDirty(row));
          field.addEventListener("input", () => markRowDirty(row));
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

    function notify(variant, title, text) {
      showToast(Toast({ variant, title, text }));
    }

    async function handleAction(userId, action) {
      const row = listEl.querySelector(`tr[data-user-id="${userId}"]`);
      row?.classList.add("is-processing");

      if (action === "delete") {
        const user = allUsers.find((u) => u.id === userId);
        if (!confirm(`Delete ${user?.name || "this user"}? This cannot be undone.`)) {
          row?.classList.remove("is-processing");
          return;
        }
      }

      try {
        await adminUserAction(userId, action);
        const labels = {
          approve: ["success", "Approved", "User can sign in."],
          reject: ["warning", "Rejected", "Registration rejected."],
          suspend: ["info", "Suspended", "User access suspended."],
          activate: ["success", "Activated", "User reactivated."],
          delete: ["warning", "Deleted", "User removed."],
        };
        const [variant, title, text] = labels[action] || ["success", "Done", "Action completed."];
        notify(variant, title, text);
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
      const expiresAtRaw = row?.querySelector('[data-field="expiresAt"]')?.value;

      try {
        await updateUserAdmin(userId, {
          accessLevel,
          expiresAt: expiresAtRaw || null,
        });
        notify("success", "Saved", "Access level and expiry updated.");
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