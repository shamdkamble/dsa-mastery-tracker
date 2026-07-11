import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import {
  renderChatMessages,
  renderChatComposer,
  scrollChatToBottom,
  escapeHtml,
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
  onMentorChatSocket,
  sendMentorChatMessage,
} from "../services/mentorChatSocket.js";

const POLL_MS = 30000;
const POLL_MS_LIVE = 300000;

let pollTimer = null;
let deskContainer = null;
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
    void loadThread()
      .then((msgs) => {
        if (msgs.length !== state.messages.length || msgs.at(-1)?.id !== state.messages.at(-1)?.id) {
          state.messages = msgs;
          patchChatFeed(container, msgs, { viewerRole: getSessionUser()?.role || "user" });
        }
      })
      .catch(() => {});
  }, interval);
}

function renderDesk({ messages, loading, error, sending }) {
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
                : renderChatMessages(messages, { viewerRole: user?.role || "user" })}
            </div>

            ${renderChatComposer({ placeholder: "Ask your mentor anything…", disabled: loading || sending })}
          </div>
        </div>
      </div>
    `,
  });
}

async function loadThread() {
  const { fetchStudentThread } = await import("../api/mentorChatApi.js");
  const data = await fetchStudentThread();
  return data.messages || [];
}

async function sendMessage(body, state, container) {
  const user = getSessionUser();
  const optimistic = createOptimisticMessage({ body, user, threadId: state.threadId });
  state.messages = upsertChatMessage(state.messages, optimistic);
  patchChatFeed(container, state.messages, { viewerRole: user?.role || "user" });

  try {
    if (isMentorChatSocketConnected()) {
      const ack = await sendMentorChatMessage({ body, clientId: optimistic.clientId });
      state.threadId = ack.thread?.id || state.threadId;
      state.messages = upsertChatMessage(state.messages, ack.message, { clientId: optimistic.clientId });
      patchChatFeed(container, state.messages, { viewerRole: user?.role || "user" });
      return;
    }
  } catch {
    /* fall through to REST */
  }

  const { sendStudentChatMessage } = await import("../api/mentorChatApi.js");
  const result = await sendStudentChatMessage(body);
  state.threadId = result.thread?.id || state.threadId;
  state.messages = upsertChatMessage(state.messages, result.message, { clientId: optimistic.clientId });
  patchChatFeed(container, state.messages, { viewerRole: user?.role || "user" });
}

function bindDesk(container, state) {
  bindChatComposer(container, {
    onSubmit: async (body) => {
      try {
        await sendMessage(body, state, container);
        showToast(Toast({ title: "Message sent", variant: "success" }));
      } catch (err) {
        state.messages = state.messages.filter((m) => !m.pending);
        patchChatFeed(container, state.messages, { viewerRole: getSessionUser()?.role || "user" });
        showToast(Toast({ title: "Send failed", text: err?.message, variant: "danger" }));
        throw err;
      }
    },
  });
}

function refreshUI(container, state) {
  const host = container.querySelector(".content-inner") || container;
  host.innerHTML = renderDesk(state);
  bindDesk(container, state);
  scrollChatToBottom(host);
}

function setupRealtime(container, state) {
  socketCleanups.forEach((fn) => fn());
  socketCleanups = [];

  socketCleanups.push(onMentorChatSocket("message.new", ({ message, threadId }) => {
    if (!message) return;
    state.threadId = threadId || state.threadId;
    state.messages = upsertChatMessage(state.messages, message);
    patchChatFeed(container, state.messages, { viewerRole: getSessionUser()?.role || "user" });
  }));

  socketCleanups.push(onMentorChatSocket("connect", () => startPolling(container, state)));
  socketCleanups.push(onMentorChatSocket("disconnect", () => startPolling(container, state)));

  void connectMentorChatSocket()
    .then(() => startPolling(container, state))
    .catch(() => startPolling(container, state));
}

export default {
  title: "Mentor Desk",
  render() {
    return renderDesk({ messages: [], loading: true, error: null, sending: false });
  },
  onMount(container) {
    deskContainer = container;
    const state = { messages: [], threadId: null, loading: true, error: null, sending: false };

    import("../api/mentorChatApi.js")
      .then(({ fetchStudentThread }) => fetchStudentThread())
      .then((data) => {
        state.messages = data.messages || [];
        state.threadId = data.thread?.id || null;
        state.loading = false;
        refreshUI(container, state);
        setupRealtime(container, state);
      })
      .catch((err) => {
        state.loading = false;
        state.error = err?.message || "Could not load Mentor Desk.";
        refreshUI(container, state);
        setupRealtime(container, state);
      });

    bindDesk(container, state);
  },
  onUnmount() {
    stopPolling();
    socketCleanups.forEach((fn) => fn());
    socketCleanups = [];
    disconnectMentorChatSocket();
    unbindChatComposer(deskContainer);
    deskContainer = null;
  },
};