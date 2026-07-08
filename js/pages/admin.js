import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, Button, EmptyState, Alert } from "../components/ui/index.js";
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  AuthApiError,
} from "../services/auth.js";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pendingRow(user) {
  return `
    <tr data-user-id="${user.id}">
      <td>
        <div class="admin-user">
          <div class="admin-user__avatar" aria-hidden="true">${user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="admin-user__name">${user.name}</div>
            <div class="admin-user__meta">${user.email}</div>
          </div>
        </div>
      </td>
      <td>${Badge({ label: "Pending", variant: "warning", size: "sm" })}</td>
      <td class="text-tertiary">${formatDate(user.createdAt)}</td>
      <td>
        <div class="admin-actions">
          ${Button({
            label: "Approve",
            variant: "primary",
            size: "sm",
            attrs: `data-action="approve" data-user-id="${user.id}"`,
          })}
          ${Button({
            label: "Reject",
            variant: "ghost",
            size: "sm",
            attrs: `data-action="reject" data-user-id="${user.id}"`,
          })}
        </div>
      </td>
    </tr>
  `;
}

function renderPendingTable(users) {
  if (!users.length) {
    return EmptyState({
      iconName: "check",
      title: "No pending requests",
      text: "New registration requests will appear here for your review.",
    });
  }

  return `
    <div class="table-wrapper">
      <table class="table table--interactive admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Requested</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="admin-pending-body">
          ${users.map(pendingRow).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export default {
  title: "Admin Panel",
  adminOnly: true,
  render() {
    return createPage({
      title: "Admin Panel",
      description: "Review registration requests and approve or reject new learners.",
      iconName: "shield",
      children: `
        <div class="admin-page">
          <div id="admin-alert" class="admin-page__alert"></div>

          <div class="admin-stats">
            <div class="card admin-stat-card">
              <div class="card__body admin-stat-card__body">
                <div class="admin-stat-card__icon" aria-hidden="true">${icon("user")}</div>
                <div>
                  <div class="admin-stat-card__value" id="admin-pending-count">—</div>
                  <div class="admin-stat-card__label">Pending approvals</div>
                </div>
              </div>
            </div>
          </div>

          <section class="admin-section">
            <div class="admin-section__head">
              <h2 class="admin-section__title">Pending registrations</h2>
              <button class="btn btn--ghost btn--sm" type="button" id="admin-refresh">
                ${icon("repeat")}
                <span>Refresh</span>
              </button>
            </div>
            <div id="admin-pending-container">
              <div class="admin-loading">Loading requests…</div>
            </div>
          </section>
        </div>
      `,
    });
  },
  onMount(container) {
    const alertEl = container.querySelector("#admin-alert");
    const listEl = container.querySelector("#admin-pending-container");
    const countEl = container.querySelector("#admin-pending-count");
    const refreshBtn = container.querySelector("#admin-refresh");

    async function loadPending() {
      alertEl.innerHTML = "";
      listEl.innerHTML = `<div class="admin-loading">Loading requests…</div>`;

      try {
        const users = await getPendingUsers();
        countEl.textContent = String(users.length);
        listEl.innerHTML = renderPendingTable(users);
      } catch (err) {
        const message = err instanceof AuthApiError
          ? err.message
          : "Failed to load pending users.";
        listEl.innerHTML = "";
        alertEl.innerHTML = Alert({ variant: "danger", title: "Error", text: message });
      }
    }

    async function handleAction(userId, action) {
      const row = listEl.querySelector(`tr[data-user-id="${userId}"]`);
      row?.classList.add("is-processing");

      try {
        if (action === "approve") {
          await approveUser(userId);
          alertEl.innerHTML = Alert({ variant: "success", title: "Approved", text: "User can now sign in." });
        } else {
          await rejectUser(userId);
          alertEl.innerHTML = Alert({ variant: "warning", title: "Rejected", text: "User registration was rejected." });
        }
        await loadPending();
      } catch (err) {
        const message = err instanceof AuthApiError
          ? err.message
          : "Action failed.";
        alertEl.innerHTML = Alert({ variant: "danger", title: "Error", text: message });
        row?.classList.remove("is-processing");
      }
    }

    listEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn || btn.disabled) return;

      const userId = btn.dataset.userId;
      const action = btn.dataset.action;
      if (!userId || !action) return;

      handleAction(userId, action);
    });

    refreshBtn?.addEventListener("click", loadPending);
    loadPending();
  },
};