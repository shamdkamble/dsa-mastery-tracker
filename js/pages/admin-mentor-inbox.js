import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { adminSubnav, adminHero, adminStatCard } from "../components/admin-shell.js";
import {
  renderChatFeedContent,
  renderChatComposer,
  scrollChatToBottom,
  escapeHtml,
  formatChatTime,
  bindChatComposer,
  unbindChatComposer,
  appendChatMessage,
  replaceChatMessage,
  removeChatMessage,
  bindChatSwipeReply,
  unbindChatSwipeReply,
  clearReplyTarget,
  updateReplyBar,
  bindChatScrollLoad,
  unbindChatScrollLoad,
  prependChatMessages,
  appendNewChatMessages,
  patchMessageReceipts,
  updateChatLoadOlder,
} from "../components/mentor-chat-ui.js";
import { showToast, Toast } from "../components/ui/index.js";
import { getSessionUser } from "../auth/session.js";
import {
  fetchAdminInbox,
  fetchAdminThread,
  fetchAdminStudentThread,
  sendAdminChatMessage,
  sendAdminChatMessageToStudent,
} from "../api/mentorChatApi.js";
import {
  buildOptimisticChatImageMessage,
  compressAndUploadChatImage,
} from "../services/chat-media.js";
import {
  CHAT_INITIAL_LIMIT,
  CHAT_PAGE_LIMIT,
  getNewestMessageId,
  getOldestMessageId,
  mergeIncomingMessages,
  prependOlderMessages,
  applyReceiptPatches,
} from "../services/chat-feed.js";

const POLL_MS = 5000;

let pollTimer = null;
let activeThreadId = null;
let activeStudentId = null;
let inboxContainer = null;

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
  hasMoreOlder,
  loadingOlder,
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
        ${renderChatFeedContent(messages, {
          viewerRole: "admin",
          hasMoreOlder,
          loadingOlder,
        })}
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
  return fetchAdminInbox();
}

async function loadThread(threadId, options = {}) {
  return fetchAdminThread(threadId, options);
}

async function loadInitialThread(threadId) {
  return loadThread(threadId, { markRead: true, limit: CHAT_INITIAL_LIMIT });
}

async function loadInitialStudentThread(studentId) {
  return fetchAdminStudentThread(studentId, { markRead: true, limit: CHAT_INITIAL_LIMIT });
}

async function pollActiveThread(state) {
  const after = getNewestMessageId(state.messages);
  if (activeThreadId) {
    return loadThread(activeThreadId, after
      ? { markRead: true, after }
      : { markRead: true, limit: CHAT_INITIAL_LIMIT });
  }
  if (activeStudentId) {
    return fetchAdminStudentThread(activeStudentId, after
      ? { markRead: true, after }
      : { markRead: true, limit: CHAT_INITIAL_LIMIT });
  }
  return null;
}

async function loadOlderActiveMessages(state) {
  const before = getOldestMessageId(state.messages);
  if (!before || !state.hasMoreOlder) return null;

  if (activeThreadId) {
    return loadThread(activeThreadId, { before, limit: CHAT_PAGE_LIMIT });
  }
  if (activeStudentId) {
    return fetchAdminStudentThread(activeStudentId, { before, limit: CHAT_PAGE_LIMIT });
  }
  return null;
}

function previewText(body) {
  const text = String(body || "").trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function previewMessage(message) {
  if (message?.imageUrl) return message.body?.trim() ? previewText(message.body) : "Photo";
  return previewText(message?.body || "");
}

function buildOptimisticAdminMessage(body, { replyToId, replyTarget } = {}) {
  const user = getSessionUser();
  return {
    id: `pending_${Date.now()}`,
    body,
    senderRole: "admin",
    senderName: user?.name || "Mentor",
    createdAt: new Date().toISOString(),
    pending: true,
    ...(replyToId ? { replyToId } : {}),
    ...(replyTarget ? {
      replyTo: {
        id: replyTarget.id,
        body: replyTarget.body,
        imageUrl: replyTarget.imageUrl || null,
        senderName: replyTarget.senderName,
        senderRole: replyTarget.senderRole,
      },
    } : {}),
  };
}

function bumpActiveThreadPreview(state, message) {
  if (!state.activeThread) return;
  state.activeThread = {
    ...state.activeThread,
    id: state.activeThread.id || message.threadId,
    lastMessageAt: message.createdAt,
    lastMessagePreview: previewMessage(message),
    lastSenderRole: "admin",
  };
  activeThreadId = state.activeThread.id || activeThreadId;

  const idx = state.threads.findIndex((t) => (
    t.studentId === state.activeThread.studentId
    || (state.activeThread.id && t.id === state.activeThread.id)
  ));
  if (idx >= 0) {
    state.threads[idx] = {
      ...state.threads[idx],
      id: state.activeThread.id || state.threads[idx].id,
      lastMessageAt: message.createdAt,
      lastMessagePreview: previewMessage(message),
      lastSenderRole: "admin",
    };
  }
}

function refreshUI(container, state) {
  const host = container.querySelector(".content-inner") || container;
  host.innerHTML = renderInbox(state);
  bindInbox(container, state);
  updateReplyBar(container);
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

function applyPollPayload(container, state, payload) {
  if (!payload) return;

  const incoming = payload.messages || [];
  const receiptPatches = payload.receiptPatches || [];

  if (payload.thread) {
    state.activeThread = payload.thread;
    if (payload.thread.id) activeThreadId = payload.thread.id;
    activeStudentId = payload.thread.studentId || activeStudentId;
  }

  if (incoming.length) {
    state.messages = mergeIncomingMessages(state.messages, incoming);
    appendNewChatMessages(container, incoming, { viewerRole: "admin" });
  }

  if (receiptPatches.length) {
    state.messages = applyReceiptPatches(state.messages, receiptPatches);
    const patchedMessages = receiptPatches
      .map((patch) => state.messages.find((msg) => msg.id === patch.id))
      .filter(Boolean);
    patchMessageReceipts(container, patchedMessages, { viewerRole: "admin" });
  }
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

  unbindChatScrollLoad(container);

  bindChatSwipeReply(container, {
    getMessages: () => state.messages,
  });

  bindChatScrollLoad(container, {
    getHasMore: () => state.hasMoreOlder && !state.loadingOlder,
    onLoadOlder: async () => {
      if (!state.hasMoreOlder || state.loadingOlder) return;

      state.loadingOlder = true;
      try {
        const data = await loadOlderActiveMessages(state);
        if (!data?.messages?.length) {
          state.hasMoreOlder = Boolean(data?.hasMoreOlder);
          updateChatLoadOlder(container, { hasMore: state.hasMoreOlder, loading: false });
          return;
        }

        state.messages = prependOlderMessages(state.messages, data.messages);
        state.hasMoreOlder = Boolean(data.hasMoreOlder);
        prependChatMessages(container, data.messages, { viewerRole: "admin" });
        updateChatLoadOlder(container, { hasMore: state.hasMoreOlder, loading: false });
      } catch {
        updateChatLoadOlder(container, { hasMore: state.hasMoreOlder, loading: false });
      } finally {
        state.loadingOlder = false;
      }
    },
  });

  bindChatComposer(container, {
    onSubmit: async (body, { replyToId, replyTarget } = {}) => {
      if (!state.activeThread) {
        showToast(Toast({ title: "Select a student first.", variant: "warning" }));
        throw new Error("Select a student first.");
      }

      const optimistic = buildOptimisticAdminMessage(body, { replyToId, replyTarget });
      state.messages = [...state.messages, optimistic];
      appendChatMessage(container, optimistic, { viewerRole: "admin" });

      try {
        const result = state.activeThread.id
          ? await sendAdminChatMessage(state.activeThread.id, body, replyToId)
          : await sendAdminChatMessageToStudent(state.activeThread.studentId, body, replyToId);
        const message = result.message;
        state.messages = state.messages.map((msg) => (
          msg.id === optimistic.id ? message : msg
        ));
        replaceChatMessage(container, optimistic.id, message, { viewerRole: "admin" });
        bumpActiveThreadPreview(state, message);
        patchThreadList(container, state);
      } catch (err) {
        state.messages = state.messages.filter((msg) => msg.id !== optimistic.id);
        removeChatMessage(container, optimistic.id);
        showToast(Toast({ title: "Send failed", text: err?.message, variant: "danger" }));
        throw err;
      }
    },
    onImageAttach: async (file, { caption, replyToId, replyTarget } = {}) => {
      if (!state.activeThread) {
        showToast(Toast({ title: "Select a student first.", variant: "warning" }));
        throw new Error("Select a student first.");
      }

      const user = getSessionUser();
      const previewUrl = URL.createObjectURL(file);
      const optimistic = buildOptimisticChatImageMessage({
        caption,
        imageUrl: previewUrl,
        replyToId,
        replyTarget,
        senderRole: "admin",
        senderName: user?.name || "Mentor",
      });

      state.messages = [...state.messages, optimistic];
      appendChatMessage(container, optimistic, { viewerRole: "admin" });

      try {
        const { url, threadId } = await compressAndUploadChatImage(file, {
          threadId: state.activeThread.id || "",
          studentId: state.activeThread.studentId || "",
        });
        if (threadId && !state.activeThread.id) {
          state.activeThread = { ...state.activeThread, id: threadId };
          activeThreadId = threadId;
        }

        const result = state.activeThread.id
          ? await sendAdminChatMessage(state.activeThread.id, { imageUrl: url, body: caption }, replyToId)
          : await sendAdminChatMessageToStudent(state.activeThread.studentId, { imageUrl: url, body: caption }, replyToId);
        const message = result.message;
        state.messages = state.messages.map((msg) => (
          msg.id === optimistic.id ? message : msg
        ));
        replaceChatMessage(container, optimistic.id, message, { viewerRole: "admin" });
        bumpActiveThreadPreview(state, message);
        patchThreadList(container, state);
      } catch (err) {
        state.messages = state.messages.filter((msg) => msg.id !== optimistic.id);
        removeChatMessage(container, optimistic.id);
        showToast(Toast({ title: "Image send failed", text: err?.message, variant: "danger" }));
        throw err;
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    },
  });
}

async function selectThread(container, state, threadId) {
  clearReplyTarget(container);
  activeThreadId = threadId;
  activeStudentId = null;
  try {
    const data = await loadInitialThread(threadId);
    state.activeThread = data.thread;
    state.messages = data.messages || [];
    state.hasMoreOlder = Boolean(data.hasMoreOlder);
    state.loadingOlder = false;
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
  clearReplyTarget(container);
  activeThreadId = null;
  activeStudentId = studentId;
  try {
    const data = await loadInitialStudentThread(studentId);
    state.activeThread = data.thread;
    state.messages = data.messages || [];
    state.hasMoreOlder = Boolean(data.hasMoreOlder);
    state.loadingOlder = false;
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
    await syncInboxData(state);
    patchThreadList(container, state);
    patchInboxStats(container, state.stats);

    if (state.messages.some((msg) => msg.pending)) return;
    if (!activeThreadId && !activeStudentId) return;

    const payload = await pollActiveThread(state);
    applyPollPayload(container, state, payload);
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
    inboxContainer = container;
    const state = {
      threads: [],
      stats: {},
      messages: [],
      activeThread: null,
      loading: true,
      error: null,
      hasMoreOlder: false,
      loadingOlder: false,
    };

    void refreshInbox(container, state);

    stopPolling();
    pollTimer = setInterval(() => {
      void pollInbox(container, state);
    }, POLL_MS);
  },
  onUnmount() {
    stopPolling();
    unbindChatComposer(inboxContainer);
    unbindChatSwipeReply(inboxContainer);
    unbindChatScrollLoad(inboxContainer);
    clearReplyTarget(inboxContainer);
    inboxContainer = null;
    activeThreadId = null;
    activeStudentId = null;
  },
};