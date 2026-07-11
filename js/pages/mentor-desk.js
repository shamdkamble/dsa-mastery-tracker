import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import {
  renderChatMessages,
  renderChatComposer,
  scrollChatToBottom,
  escapeHtml,
} from "../components/mentor-chat-ui.js";
import { showToast, Toast } from "../components/ui/index.js";
import { getSessionUser } from "../auth/session.js";

const POLL_MS = 5000;

let pollTimer = null;

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
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

function bindDesk(container, state) {
  const root = container.querySelector("[data-mentor-desk]");
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "true";

  container.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-mentor-chat-form]");
    if (!form) return;
    e.preventDefault();

    const textarea = form.querySelector("textarea");
    const body = textarea?.value?.trim();
    if (!body) return;

    const btn = form.querySelector("button");
    btn?.setAttribute("disabled", "true");
    textarea.disabled = true;

    try {
      const { sendStudentChatMessage } = await import("../api/mentorChatApi.js");
      await sendStudentChatMessage(body);
      textarea.value = "";
      state.messages = await loadThread();
      refreshUI(container, state);
      showToast(Toast({ title: "Message sent", variant: "success" }));
    } catch (err) {
      showToast(Toast({ title: "Send failed", text: err?.message, variant: "danger" }));
    } finally {
      btn?.removeAttribute("disabled");
      textarea.disabled = false;
      textarea.focus();
    }
  });
}

function refreshUI(container, state) {
  const host = container.querySelector(".content-inner") || container;
  host.innerHTML = renderDesk(state);
  bindDesk(container, state);
  scrollChatToBottom(host);
}

export default {
  title: "Mentor Desk",
  render() {
    return renderDesk({ messages: [], loading: true, error: null, sending: false });
  },
  onMount(container) {
    const state = { messages: [], loading: true, error: null, sending: false };

    void loadThread()
      .then((messages) => {
        state.messages = messages;
        state.loading = false;
        refreshUI(container, state);

        stopPolling();
        pollTimer = setInterval(() => {
          void loadThread()
            .then((msgs) => {
              if (msgs.length !== state.messages.length
                || msgs.at(-1)?.id !== state.messages.at(-1)?.id) {
                state.messages = msgs;
                const feed = container.querySelector("[data-mentor-chat-feed]");
                if (feed) {
                  feed.innerHTML = renderChatMessages(msgs, { viewerRole: getSessionUser()?.role || "user" });
                  scrollChatToBottom(container);
                }
              }
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
  },
};