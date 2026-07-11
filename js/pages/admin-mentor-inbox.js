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
  unbindChatComposer,
  createOptimisticMessage,
  upsertChatMessage,
  patchChatFeed,
} from "../components/mentor-chat-ui.js";
import { showToast, Toast } from "../components/ui/index.js";
import { getSessionUser } from "../auth/session.js";
import {
  connectMentorChatSocket,
  disconnectMentorChatSocket,
  isMentorChatSocketConnected,
  joinMentorThread,
  onMentorChatSocket,
  sendMentorChatMessage,
} from "../services/mentorChatSocket.js";

const POLL_MS = 30000;
const POLL_MS_LIVE = 300000;

let pollTimer = null;
let activeThreadId = null;
let activeStudentId = null;
let inboxContainer = null;
let socketCleanups = [];

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(container, state) {
  stopPolling();
  const interval = isMentorChatSocketConnected() ? POLL_MS_LIVE : POLL_MS;
  pollTimer = setInterval(() => {
    void pollInbox(container, state);
  }, interval);
}

function isThreadSelected(thread, activeThread) {
  if (!activeThread) return false;
  if (thread.id && activeThread.id) return thread.id === activeThread.id;
  return thread.studentId === activeThread.studentId;
}

function upsertThreadInList(threads, updated) {
  if (!updated?.studentId) return threads;
  const list = Array.isArray(threads) ? [...threads] : [];
  const idx = list.findIndex((t) => t.studentId === updated.studentId || t.id === updated.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updated };
  }
  return list;
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

async function sendMessage(body, state, container) {
  if (!state.activeThread) throw new Error("Select a student first.");

  const user = getSessionUser();
  const optimistic = createOptimisticMessage({
    body,
    user,
    threadId: state.activeThread.id,
  });
  state.messages = upsertChatMessage(state.messages, optimistic);
  patchChatFeed(container, state.messages, { viewerRole: "admin" });

  const payload = {
    body,
    clientId: optimistic.clientId,
    threadId: state.activeThread.id || undefined,
    studentId: state.activeThread.id ? undefined : state.activeThread.studentId,
  };

  try {
    if (isMentorChatSocketConnected()) {
      const ack = await sendMentorChatMessage(payload);
      state.activeThread = ack.thread || state.activeThread;
      activeThreadId = state.activeThread?.id || null;
      activeStudentId = state.activeThread?.studentId || null;
      if (activeThreadId) joinMentorThread(activeThreadId);
      state.messages = upsertChatMessage(state.messages, ack.message, { clientId: optimistic.clientId });
      state.threads = upsertThreadInList(state.threads, ack.thread);
      patchChatFeed(container, state.messages, { viewerRole: "admin" });
      patchThreadList(container, state);
      return;
    }
  } catch {
    /* REST fallback */
  }

  const api = await import("../api/mentorChatApi.js");
  const result = state.activeThread.id
    ? await api.sendAdminChatMessage(state.activeThread.id, body)
    : await api.sendAdminChatMessageToStudent(state.activeThread.studentId, body);

  state.activeThread = result.thread || state.activeThread;
  activeThreadId = state.activeThread?.id || null;
  activeStudentId = state.activeThread?.studentId || null;
  if (activeThreadId) joinMentorThread(activeThreadId);
  state.messages = upsertChatMessage(state.messages, result.message, { clientId: optimistic.clientId });
  state.threads = upsertThreadInList(state.threads, result.thread);
  patchChatFeed(container, state.messages, { viewerRole: "admin" });
  patchThreadList(container, state);
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

  bindChatComposer(container, {
    onSubmit: async (body) => {
      try {
        await sendMessage(body, state, container);
      } catch (err) {
        state.messages = state.messages.filter((m) => !m.pending);
        patchChatFeed(container, state.messages, { viewerRole: "admin" });
        showToast(Toast({ title: "Send failed", text: err?.message, variant: "danger" }));
        throw err;
      }
    },
  });
}

async function selectThread(container, state, threadId) {
  activeThreadId = threadId;
  activeStudentId = null;
  joinMentorThread(threadId);
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
    if (data.thread?.id) {
      activeThreadId = data.thread.id;
      joinMentorThread(data.thread.id);
    }
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
      patchChatFeed(container, state.messages, { viewerRole: "admin" });
    }
  } catch {
    /* ignore */
  }
}

function setupRealtime(container, state) {
  socketCleanups.forEach((fn) => fn());
  socketCleanups = [];

  socketCleanups.push(onMentorChatSocket("message.new", ({ message, threadId }) => {
    if (!message) return;
    state.threads = upsertThreadInList(state.threads, {
      id: threadId,
      lastMessagePreview: message.body,
      lastMessageAt: message.createdAt,
      lastSenderRole: message.senderRole,
    });

    const viewing = state.activeThread?.id === threadId
      || state.activeThread?.studentId === message.senderId;

    if (viewing) {
      state.messages = upsertChatMessage(state.messages, message);
      patchChatFeed(container, state.messages, { viewerRole: "admin" });
    }

    patchThreadList(container, state);
  }));

  socketCleanups.push(onMentorChatSocket("thread.updated", ({ thread }) => {
    if (!thread) return;
    state.threads = upsertThreadInList(state.threads, thread);
    if (state.activeThread?.studentId === thread.studentId) {
      state.activeThread = { ...state.activeThread, ...thread };
    }
    if (thread.id) joinMentorThread(thread.id);
    patchThreadList(container, state);
  }));

  socketCleanups.push(onMentorChatSocket("connect", () => startPolling(container, state)));
  socketCleanups.push(onMentorChatSocket("disconnect", () => startPolling(container, state)));

  void connectMentorChatSocket()
    .then(() => startPolling(container, state))
    .catch(() => startPolling(container, state));
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
    inboxContainer = container;
    const state = {
      threads: [],
      stats: {},
      messages: [],
      activeThread: null,
      loading: true,
      error: null,
    };

    void refreshInbox(container, state).then(() => {
      setupRealtime(container, state);
    });
  },
  onUnmount() {
    stopPolling();
    socketCleanups.forEach((fn) => fn());
    socketCleanups = [];
    disconnectMentorChatSocket();
    unbindChatComposer(inboxContainer);
    inboxContainer = null;
    activeThreadId = null;
    activeStudentId = null;
  },
};