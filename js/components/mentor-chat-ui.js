/**
 * Shared mentor chat UI helpers
 */

import { icon } from "./icons.js";

const CHAT_EMOJIS = [
  "👍", "👎", "👋", "🙏", "❤️", "😊", "😂", "😅", "🤔", "🎉",
  "🔥", "✅", "❓", "💡", "⭐", "🚀", "💪", "🎯", "👏", "😎",
  "🙌", "✨", "📚", "💯", "⚡", "🙂", "😢", "😮", "🤝", "☕",
];

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatChatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date().toISOString().slice(0, 10);
  const key = d.toISOString().slice(0, 10);
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (key === today) return time;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${time}`;
}

export function renderChatMessages(messages, { viewerRole = "user" } = {}) {
  if (!messages?.length) {
    return `
      <div class="mentor-chat__empty">
        ${icon("message")}
        <p>No messages yet. Say hello — your mentor will reply here.</p>
      </div>
    `;
  }

  return messages.map((msg) => {
    const isMine = msg.senderRole === "admin"
      ? viewerRole === "admin"
      : viewerRole !== "admin";
    const bubbleClass = isMine ? "mentor-chat__bubble--mine" : "mentor-chat__bubble--theirs";
    const roleLabel = msg.senderRole === "admin" ? "Mentor" : escapeHtml(msg.senderName || "Student");

    return `
      <div class="mentor-chat__message${isMine ? " mentor-chat__message--mine" : ""}">
        <div class="mentor-chat__meta">
          <span class="mentor-chat__sender">${roleLabel}</span>
          <time class="mentor-chat__time" datetime="${msg.createdAt}">${formatChatTime(msg.createdAt)}</time>
        </div>
        <div class="mentor-chat__bubble ${bubbleClass}">${escapeHtml(msg.body).replace(/\n/g, "<br>")}</div>
      </div>
    `;
  }).join("");
}

function renderEmojiPicker() {
  return CHAT_EMOJIS.map((emoji) => `
    <button type="button" class="mentor-chat__emoji-item" data-emoji="${emoji}" aria-label="Insert ${emoji}">
      ${emoji}
    </button>
  `).join("");
}

export function renderChatComposer({ placeholder = "Type a message", disabled = false } = {}) {
  return `
    <form class="mentor-chat__composer" data-mentor-chat-form>
      <div class="mentor-chat__composer-bar">
        <div class="mentor-chat__input-wrap">
          <textarea
            class="mentor-chat__input"
            name="body"
            rows="1"
            placeholder="${escapeHtml(placeholder)}"
            maxlength="4000"
            inputmode="text"
            autocomplete="off"
            autocorrect="on"
            ${disabled ? "disabled" : ""}
            aria-label="Message"
          ></textarea>
          <button
            type="button"
            class="mentor-chat__emoji-btn"
            data-emoji-toggle
            aria-label="Open emoji picker"
            ${disabled ? "disabled" : ""}
          >${icon("smile")}</button>
        </div>
        <button class="mentor-chat__send" type="submit" aria-label="Send message" ${disabled ? "disabled" : ""}>
          ${icon("send")}
        </button>
      </div>
      <div class="mentor-chat__emoji-picker" data-emoji-picker hidden>
        ${renderEmojiPicker()}
      </div>
    </form>
  `;
}

function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const value = textarea.value;
  textarea.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
  const pos = start + text.length;
  textarea.selectionStart = pos;
  textarea.selectionEnd = pos;
  textarea.focus();
}

function setPickerOpen(picker, open) {
  if (!picker) return;
  if (open) picker.removeAttribute("hidden");
  else picker.setAttribute("hidden", "");
}

function closeEmojiPickers(container, except) {
  container.querySelectorAll("[data-emoji-picker]").forEach((picker) => {
    if (picker !== except) setPickerOpen(picker, false);
  });
}

export function bindChatComposer(container, { onSubmit } = {}) {
  if (!container) return;
  if (onSubmit) container._mentorChatOnSubmit = onSubmit;
  if (container.dataset.chatComposerBound) return;
  container.dataset.chatComposerBound = "true";

  container.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-emoji-toggle]");
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      const form = toggle.closest("[data-mentor-chat-form]");
      const picker = form?.querySelector("[data-emoji-picker]");
      if (!picker) return;
      const willOpen = picker.hasAttribute("hidden");
      closeEmojiPickers(container);
      setPickerOpen(picker, willOpen);
      return;
    }

    const emojiBtn = e.target.closest("[data-emoji]");
    if (emojiBtn) {
      e.preventDefault();
      e.stopPropagation();
      const form = emojiBtn.closest("[data-mentor-chat-form]");
      const textarea = form?.querySelector("textarea");
      insertAtCursor(textarea, emojiBtn.dataset.emoji || "");
      setPickerOpen(form?.querySelector("[data-emoji-picker]"), false);
    }
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) return;
    if (e.target.closest("[data-emoji-toggle], [data-emoji-picker]")) return;
    closeEmojiPickers(container);
  });

  container.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-mentor-chat-form]");
    if (!form || !container._mentorChatOnSubmit) return;
    e.preventDefault();
    if (form.dataset.sending === "true") return;

    const textarea = form.querySelector("textarea");
    const body = textarea?.value?.trim();
    if (!body) return;

    const submitBtn = form.querySelector(".mentor-chat__send");
    form.dataset.sending = "true";
    submitBtn?.setAttribute("disabled", "true");
    textarea.disabled = true;

    try {
      await container._mentorChatOnSubmit(body, { form, textarea, submitBtn });
      textarea.value = "";
    } finally {
      delete form.dataset.sending;
      submitBtn?.removeAttribute("disabled");
      textarea.disabled = false;
      textarea.focus();
    }
  });
}

export function unbindChatComposer(container) {
  if (!container) return;
  delete container._mentorChatOnSubmit;
}

export function scrollChatToBottom(container) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (feed) feed.scrollTop = feed.scrollHeight;
}