import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { adminSubnav, adminHero, adminStatCard } from "../components/admin-shell.js";
import {
  renderChatMessages,
  renderChatComposer,
  scrollChatToBottom,
  escapeHtml,
  formatChatTime,
  bindChatComposer,
} from "../components/mentor-chat-ui.js";
import { showToast, Toast } from "../components/ui/index.js";

const POLL_MS = 5000;

let pollTimer = null;
let activeThreadId = null;
let activeStudentId = null;

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function isThreadSelected(thread, activeThread) {
  if (!activeThread) return false;
  if (thread.id && activeThread.id) return thread.id === activeThread.id;
  return thread.studentId === activeThread.studentId;
}

function renderThreadItem(thread, activeThread) {
  const unread = thread.unreadByAdmin > 0;
  const hasConversation = Boolean(thread.lastMessageAt);
  const preview = thread.lastMessagePreview
    || (hasConversation ? "No messages yet" : "Tap to start a conversation");
  const attrs = thread.id
    ? `data-thread-id="${thread.id}"`
    : `data-student-id="${thread.studentId}"`;

  return `
    <button
      type="button"
      class="mentor-inbox__thread${isThreadSelected(thread, activeThread) ? " is-active" : ""}${unread ? " is-unread" : ""}${!hasConversation ? " is-new" : ""}"
      ${attrs}
    >
      <div class="mentor-inbox__thread-top">
        <span class="mentor-inbox__thread-name">${escapeHtml(thread.studentName || "Student")}</span>
        ${unread ? `<span class="mentor-inbox__unread">${thread.unreadByAdmin}</span>` : ""}
      </div>
      <div class="mentor-inbox__thread-preview">${escapeHtml(preview)}</div>
      <div class="mentor-inbox__thread-time">${hasConversation ? formatChatTime(thread.lastMessageAt) : escapeHtml(thread.studentEmail || "")}</div>
    </button>
  `;
}

function renderInbox({
  threads,
  stats,
  messages,
  activeThread,
  loading,
  error,
}) {
  const threadList = threads?.length
    ? threads.map((t) => renderThreadItem(t, activeThread)).join("")
    : `<div class="mentor-inbox__empty-list">No students registered yet.</div>`;

  const conversation = activeThread
    ? `
      <div class="mentor-chat__panel-head mentor-inbox__conv-head">
        <div class="mentor-chat__avatar" aria-hidden="true">${icon("user")}</div>
        <div>
          <div class="mentor-chat__panel-title">${escapeHtml(activeThread.studentName)}</div>
          <div class="mentor-chat__panel-status text-tertiary text-xs">${escapeHtml(activeThread.studentEmail || "")}</div>
        </div>
      </div>
      <div class="mentor-chat__feed" data-mentor-chat-feed>
        ${renderChatMessages(messages, { viewerRole: "admin" })}
      </div>
      ${renderChatComposer({ placeholder: `Message ${activeThread.studentName}…` })}
    `
    : `
      <div class="mentor-inbox__placeholder">
        ${icon("message")}
        <h3>Select a student</h3>
        <p>Pick any student from the list — you can start a new conversation or continue an existing one.</p>
      </div>
    `;

  return createPage({
    hideHeader: true,
    children: `
      <div class="admin-page admin-page--modern mentor-inbox-page" data-mentor-inbox>
        ${adminHero({
          title: "Mentor Inbox",
          description: "Private 1:1 conversations with every student. Each learner has their own thread — only you can see all sides.",
          badge: "Live Chat",
        })}
        ${adminSubnav("mentor-inbox")}

        ${error ? `<div class="mentor-chat__alert">${escapeHtml(error)}</div>` : ""}

        <div class="mentor-inbox__stats">
          ${adminStatCard({ iconName: "user", value: String(stats?.total || 0), label: "Students", variant: "accent" })}
          ${adminStatCard({ iconName: "message", value: String(stats?.unread || 0), label: "Unread", variant: "warning" })}
          ${adminStatCard({ iconName: "zap", value: String(stats?.activeToday || 0), label: "Active today", variant: "success" })}
        </div>

        <div class="mentor-inbox__layout">
          <aside class="mentor-inbox__sidebar">
            <div class="mentor-inbox__sidebar-head">
              <h2>Students</h2>
              ${loading ? `<span class="text-xs text-tertiary">Syncing…</span>` : ""}
            </div>
            <div class="mentor-inbox__thread-list" data-thread-list>
              ${threadList}
            </div>
          </aside>
          <section class="mentor-inbox__conversation mentor-chat">
            <div class="mentor-chat__panel" data-conversation-panel>
              ${conversation}
            </div>
          </section>
        </div>
      </div>
    `,
  });
}

async function loadInbox() {
  const { fetchAdminInbox } = await import("../api/mentorChatApi.js");
  return fetchAdminInbox();
}

async function loadThread(threadId) {
  const { fetchAdminThread } = await import("../api/mentorChatApi.js");
  return fetchAdminThread(threadId);
}

function refreshUI(container, state) {
  const host = container.querySelector(".content-inner") || container;
  host.innerHTML = renderInbox(state);
  bindInbox(container, state);
  scrollChatToBottom(host);
}

function patchInboxStats(container, stats) {
  const values = container.querySelectorAll(".mentor-inbox__stats .admin-stat-card__value");
  if (values.length < 3 || !stats) return;
  values[0].textContent = String(stats.total || 0);
  values[1].textContent = String(stats.unread || 0);
  values[2].textContent = String(stats.activeToday || 0);
}

function patchThreadList(container, state) {
  const threadList = container.querySelector("[data-thread-list]");
  if (!threadList) return;

  threadList.innerHTML = state.threads?.length
    ? state.threads.map((t) => renderThreadItem(t, state.activeThread)).join("")
    : `<div class="mentor-inbox__empty-list">No students registered yet.</div>`;
}

function patchMessages(container, state) {
  const feed = container.querySelector("[data-mentor-chat-feed]");
  if (!feed) return;
  feed.innerHTML = renderChatMessages(state.messages, { viewerRole: "admin" });
  scrollChatToBottom(container);
}

function bindInbox(container, state) {
  const root = container.querySelector("[data-mentor-inbox]");
  if (!root) return;

  const threadList = root.querySelector("[data-thread-list]");
  if (threadList && !threadList.dataset.bound) {
    threadList.dataset.bound = "true";
    threadList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-thread-id], [data-student-id]");
      if (!btn) return;
      if (btn.dataset.threadId) {
        void selectThread(container, state, btn.dataset.threadId);
        return;
      }
      void selectStudent(container, state, btn.dataset.studentId);
    });
  }

  bindChatComposer(container);

  const form = root.querySelector("[data-mentor-chat-form]");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.activeThread?.id) return;

      const textarea = form.querySelector("textarea");
      const body = textarea?.value?.trim();
      if (!body) return;

      const submitBtn = form.querySelector(".mentor-chat__send");
      submitBtn?.setAttribute("disabled", "true");
      textarea.disabled = true;

      try {
        const api = await import("../api/mentorChatApi.js");
        if (state.activeThread.id) {
          await api.sendAdminChatMessage(state.activeThread.id, body);
        } else {
          await api.sendAdminChatMessageToStudent(state.activeThread.studentId, body);
        }
        textarea.value = "";
        const data = state.activeThread.id
          ? await loadThread(state.activeThread.id)
          : await api.fetchAdminStudentThread(state.activeThread.studentId);
        state.messages = data.messages || [];
        state.activeThread = data.thread;
        activeThreadId = data.thread?.id || null;
        activeStudentId = data.thread?.studentId || null;
        const inbox = await loadInbox();
        state.threads = inbox.threads || [];
        state.stats = inbox.stats || {};
        refreshUI(container, state);
      } catch (err) {
        showToast(Toast({ title: "Send failed", text: err?.message, variant: "danger" }));
      } finally {
        submitBtn?.removeAttribute("disabled");
        textarea.disabled = false;
        textarea.focus();
      }
    });
  }
}

async function selectThread(container, state, threadId) {
  activeThreadId = threadId;
  activeStudentId = null;
  try {
    const data = await loadThread(threadId);
    state.activeThread = data.thread;
    state.messages = data.messages || [];
    activeStudentId = data.thread?.studentId || null;
    const inbox = await loadInbox();
    state.threads = inbox.threads || [];
    state.stats = inbox.stats || {};
    refreshUI(container, state);
  } catch (err) {
    showToast(Toast({ title: "Load failed", text: err?.message, variant: "danger" }));
  }
}

async function selectStudent(container, state, studentId) {
  activeThreadId = null;
  activeStudentId = studentId;
  try {
    const { fetchAdminStudentThread } = await import("../api/mentorChatApi.js");
    const data = await fetchAdminStudentThread(studentId);
    state.activeThread = data.thread;
    state.messages = data.messages || [];
    if (data.thread?.id) activeThreadId = data.thread.id;
    const inbox = await loadInbox();
    state.threads = inbox.threads || [];
    state.stats = inbox.stats || {};
    refreshUI(container, state);
  } catch (err) {
    showToast(Toast({ title: "Load failed", text: err?.message, variant: "danger" }));
  }
}

async function syncInboxData(state) {
  const inbox = await loadInbox();
  state.threads = inbox.threads || [];
  state.stats = inbox.stats || {};
  state.loading = false;
  state.error = null;

  if (activeThreadId) {
    const data = await loadThread(activeThreadId);
    state.activeThread = data.thread;
    state.messages = data.messages || [];
    activeStudentId = data.thread?.studentId || null;
  } else if (activeStudentId) {
    const { fetchAdminStudentThread } = await import("../api/mentorChatApi.js");
    const data = await fetchAdminStudentThread(activeStudentId);
    state.activeThread = data.thread;
    state.messages = data.messages || [];
    if (data.thread?.id) activeThreadId = data.thread.id;
  }
}

async function refreshInbox(container, state) {
  try {
    await syncInboxData(state);
    refreshUI(container, state);
  } catch (err) {
    state.error = err?.message || "Failed to sync inbox.";
    refreshUI(container, state);
  }
}

async function pollInbox(container, state) {
  try {
    const prevCount = state.messages.length;
    const prevLastId = state.messages.at(-1)?.id;
    await syncInboxData(state);
    patchThreadList(container, state);
    patchInboxStats(container, state.stats);
    if ((activeThreadId || activeStudentId)
      && (state.messages.length !== prevCount || state.messages.at(-1)?.id !== prevLastId)) {
      patchMessages(container, state);
    }
  } catch {
    /* ignore background poll errors */
  }
}

export default {
  title: "Mentor Inbox",
  adminOnly: true,
  render() {
    return renderInbox({
      threads: [],
      stats: {},
      messages: [],
      activeThread: null,
      loading: true,
      error: null,
    });
  },
  onMount(container) {
    const state = {
      threads: [],
      stats: {},
      messages: [],
      activeThread: null,
      loading: true,
      error: null,
    };

    void refreshInbox(container, state);

    stopPolling();
    pollTimer = setInterval(() => {
      void pollInbox(container, state);
    }, POLL_MS);
  },
  onUnmount() {
    stopPolling();
    activeThreadId = null;
    activeStudentId = null;
  },
};