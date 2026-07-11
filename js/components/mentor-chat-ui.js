/**
 * Shared mentor chat UI helpers
 */

import { icon } from "./icons.js";

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

export function renderChatComposer({ placeholder = "Type your message…", disabled = false } = {}) {
  return `
    <form class="mentor-chat__composer" data-mentor-chat-form>
      <textarea
        class="input mentor-chat__input"
        name="body"
        rows="2"
        placeholder="${escapeHtml(placeholder)}"
        maxlength="4000"
        ${disabled ? "disabled" : ""}
        aria-label="Message"
      ></textarea>
      <button class="btn btn--primary mentor-chat__send" type="submit" ${disabled ? "disabled" : ""}>
        ${icon("send")}
        <span>Send</span>
      </button>
    </form>
  `;
}

export function scrollChatToBottom(container) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (feed) feed.scrollTop = feed.scrollHeight;
}