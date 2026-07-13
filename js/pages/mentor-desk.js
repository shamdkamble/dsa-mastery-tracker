import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import {
  renderChatFeedContent,
  renderChatComposer,
  scrollChatToBottom,
  escapeHtml,
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
import { fetchStudentThread, sendStudentChatMessage } from "../api/mentorChatApi.js";
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
let deskContainer = null;

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function renderDesk({ messages, loading, error, sending, hasMoreOlder, loadingOlder }) {
  const user = getSessionUser();

  return createPage({
    hideHeader: true,
    children: `
      <div class="mentor-desk" data-mentor-desk>
        <header class="mentor-desk__hero">
          <div class="mentor-desk__hero-glow" aria-hidden="true"></div>
          <div class="mentor-desk__hero-content">
            <span class="mentor-desk__badge">${icon("message")}<span>Mentor Desk</span></span>
            <h1 class="mentor-desk__title">Chat with your mentor</h1>
            <p class="mentor-desk__desc">
              Private 1:1 help for ${escapeHtml(user?.name || "you")}. Ask doubts, share blockers, or get guidance on your DSA journey.
            </p>
          </div>
        </header>

        ${error ? `<div class="mentor-chat__alert">${escapeHtml(error)}</div>` : ""}

        <div class="mentor-chat mentor-chat--student">
          <div class="mentor-chat__panel">
            <div class="mentor-chat__panel-head">
              <div class="mentor-chat__avatar mentor-chat__avatar--mentor" aria-hidden="true">${icon("user")}</div>
              <div>
                <div class="mentor-chat__panel-title">DSAMantra Mentor</div>
                <div class="mentor-chat__panel-status"><span class="mentor-chat__online"></span> Replies during office hours</div>
              </div>
            </div>

            <div class="mentor-chat__feed" data-mentor-chat-feed>
              ${loading
                ? `<div class="mentor-chat__loading">Loading conversation…</div>`
                : renderChatFeedContent(messages, {
                  viewerRole: user?.role || "user",
                  hasMoreOlder,
                  loadingOlder,
                })}
            </div>

            ${renderChatComposer({ placeholder: "Ask your mentor anything…", disabled: loading || sending })}
          </div>
        </div>
      </div>
    `,
  });
}

async function loadInitialThread() {
  return fetchStudentThread({ markRead: true, limit: CHAT_INITIAL_LIMIT });
}

async function pollThread(state) {
  const after = getNewestMessageId(state.messages);
  if (!after) {
    return fetchStudentThread({ markRead: true, limit: CHAT_INITIAL_LIMIT });
  }
  return fetchStudentThread({ markRead: true, after });
}

async function loadOlderMessages(state) {
  const before = getOldestMessageId(state.messages);
  if (!before || !state.hasMoreOlder || state.loadingOlder) return null;
  return fetchStudentThread({ before, limit: CHAT_PAGE_LIMIT });
}

function buildOptimisticMessage(body, { replyToId, replyTarget } = {}) {
  const user = getSessionUser();
  return {
    id: `pending_${Date.now()}`,
    body,
    senderRole: user?.role === "tester" ? "tester" : "user",
    senderName: user?.name || "Student",
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

function bindDesk(container, state) {
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
        const data = await loadOlderMessages(state);
        if (!data?.messages?.length) {
          state.hasMoreOlder = Boolean(data?.hasMoreOlder);
          updateChatLoadOlder(container, { hasMore: state.hasMoreOlder, loading: false });
          return;
        }

        const viewerRole = getSessionUser()?.role || "user";
        state.messages = prependOlderMessages(state.messages, data.messages);
        state.hasMoreOlder = Boolean(data.hasMoreOlder);
        prependChatMessages(container, data.messages, { viewerRole });
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
      const viewerRole = getSessionUser()?.role || "user";
      const optimistic = buildOptimisticMessage(body, { replyToId, replyTarget });
      state.messages = [...state.messages, optimistic];
      appendChatMessage(container, optimistic, { viewerRole });

      try {
        const { message } = await sendStudentChatMessage(body, replyToId);
        state.messages = state.messages.map((msg) => (
          msg.id === optimistic.id ? message : msg
        ));
        replaceChatMessage(container, optimistic.id, message, { viewerRole });
      } catch (err) {
        state.messages = state.messages.filter((msg) => msg.id !== optimistic.id);
        removeChatMessage(container, optimistic.id);
        showToast(Toast({ title: "Send failed", text: err?.message, variant: "danger" }));
        throw err;
      }
    },
    onImageAttach: async (file, { caption, replyToId, replyTarget } = {}) => {
      const user = getSessionUser();
      const viewerRole = user?.role || "user";
      const previewUrl = URL.createObjectURL(file);
      const optimistic = buildOptimisticChatImageMessage({
        caption,
        imageUrl: previewUrl,
        replyToId,
        replyTarget,
        senderRole: viewerRole === "tester" ? "tester" : "user",
        senderName: user?.name || "Student",
      });

      state.messages = [...state.messages, optimistic];
      appendChatMessage(container, optimistic, { viewerRole });

      try {
        const { url, threadId } = await compressAndUploadChatImage(file, {
          threadId: state.threadId,
        });
        if (threadId && !state.threadId) state.threadId = threadId;

        const { message } = await sendStudentChatMessage({ imageUrl: url, body: caption }, replyToId);
        state.messages = state.messages.map((msg) => (
          msg.id === optimistic.id ? message : msg
        ));
        replaceChatMessage(container, optimistic.id, message, { viewerRole });
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

function refreshUI(container, state) {
  const host = container.querySelector(".content-inner") || container;
  host.innerHTML = renderDesk(state);
  bindDesk(container, state);
  updateReplyBar(container);
  scrollChatToBottom(host);
}

function applyPollPayload(container, state, payload) {
  const viewerRole = getSessionUser()?.role || "user";
  const incoming = payload.messages || [];
  const receiptPatches = payload.receiptPatches || [];

  if (!state.threadId && payload.thread?.id) state.threadId = payload.thread.id;

  if (incoming.length) {
    state.messages = mergeIncomingMessages(state.messages, incoming);
    appendNewChatMessages(container, incoming, { viewerRole });
  }

  if (receiptPatches.length) {
    state.messages = applyReceiptPatches(state.messages, receiptPatches);
    const patchedMessages = receiptPatches
      .map((patch) => state.messages.find((msg) => msg.id === patch.id))
      .filter(Boolean);
    patchMessageReceipts(container, patchedMessages, { viewerRole });
  }
}

export default {
  title: "Mentor Desk",
  render() {
    return renderDesk({
      messages: [],
      loading: true,
      error: null,
      sending: false,
      hasMoreOlder: false,
      loadingOlder: false,
    });
  },
  onMount(container) {
    deskContainer = container;
    const state = {
      messages: [],
      threadId: null,
      loading: true,
      error: null,
      sending: false,
      hasMoreOlder: false,
      loadingOlder: false,
    };

    void loadInitialThread()
      .then((data) => {
        state.messages = data.messages || [];
        state.threadId = data.thread?.id || null;
        state.hasMoreOlder = Boolean(data.hasMoreOlder);
        state.loading = false;
        refreshUI(container, state);

        stopPolling();
        pollTimer = setInterval(() => {
          if (state.messages.some((msg) => msg.pending)) return;

          void pollThread(state)
            .then((payload) => {
              applyPollPayload(container, state, payload);
            })
            .catch(() => {});
        }, POLL_MS);
      })
      .catch((err) => {
        state.loading = false;
        state.error = err?.message || "Could not load Mentor Desk.";
        refreshUI(container, state);
      });

    bindDesk(container, state);
  },
  onUnmount() {
    stopPolling();
    unbindChatComposer(deskContainer);
    unbindChatSwipeReply(deskContainer);
    unbindChatScrollLoad(deskContainer);
    clearReplyTarget(deskContainer);
    deskContainer = null;
  },
};