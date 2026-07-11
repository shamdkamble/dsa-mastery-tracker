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

export function renderChatComposer({ placeholder = "Type your message…", disabled = false } = {}) {
  return `
    <form class="mentor-chat__composer" data-mentor-chat-form>
      <div class="mentor-chat__composer-bar">
        <button
          type="button"
          class="mentor-chat__emoji-btn"
          data-emoji-toggle
          aria-label="Add emoji"
          ${disabled ? "disabled" : ""}
        >😊</button>
        <div class="mentor-chat__input-wrap">
          <textarea
            class="mentor-chat__input"
            name="body"
            rows="1"
            placeholder="${escapeHtml(placeholder)}"
            maxlength="4000"
            ${disabled ? "disabled" : ""}
            aria-label="Message"
          ></textarea>
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

function closeEmojiPickers(container, except) {
  container.querySelectorAll("[data-emoji-picker]").forEach((picker) => {
    if (picker !== except) picker.hidden = true;
  });
}

export function bindChatComposer(container) {
  if (!container || container.dataset.chatComposerBound) return;
  container.dataset.chatComposerBound = "true";

  container.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-emoji-toggle]");
    if (toggle) {
      e.preventDefault();
      const form = toggle.closest("[data-mentor-chat-form]");
      const picker = form?.querySelector("[data-emoji-picker]");
      if (!picker) return;
      const willOpen = picker.hidden;
      closeEmojiPickers(container);
      picker.hidden = !willOpen;
      return;
    }

    const emojiBtn = e.target.closest("[data-emoji]");
    if (emojiBtn) {
      e.preventDefault();
      const form = emojiBtn.closest("[data-mentor-chat-form]");
      const textarea = form?.querySelector("textarea");
      insertAtCursor(textarea, emojiBtn.dataset.emoji || "");
      form?.querySelector("[data-emoji-picker]")?.setAttribute("hidden", "");
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-emoji-toggle], [data-emoji-picker]")) return;
    closeEmojiPickers(container);
  });
}

export function scrollChatToBottom(container) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (feed) feed.scrollTop = feed.scrollHeight;
}