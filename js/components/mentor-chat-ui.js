/**
 * Shared mentor chat UI helpers
 */

import { icon } from "./icons.js";

const CHAT_EMOJIS = [
  "👍", "👎", "👋", "🙏", "❤️", "😊", "😂", "😅", "🤔", "🎉",
  "🔥", "✅", "❓", "💡", "⭐", "🚀", "💪", "🎯", "👏", "😎",
  "🙌", "✨", "📚", "💯", "⚡", "🙂", "😢", "😮", "🤝", "☕",
];

const SWIPE_REPLY_THRESHOLD = 56;
const SWIPE_MAX = 72;

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

function truncateReplyText(body, max = 120) {
  const text = String(body || "").trim().replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function replySenderLabel(replyTo) {
  return replyTo.senderRole === "admin" ? "Mentor" : escapeHtml(replyTo.senderName || "Student");
}

export function renderReplyQuote(replyTo, { viewerRole = "user" } = {}) {
  if (!replyTo) return "";
  const roleClass = replyTo.senderRole === "admin"
    ? "mentor-chat__quote--mentor"
    : "mentor-chat__quote--student";
  const accentClass = replyTo.senderRole === "admin"
    ? "mentor-chat__quote-accent--mentor"
    : "mentor-chat__quote-accent--student";

  return `
    <div class="mentor-chat__quote ${roleClass}">
      <span class="mentor-chat__quote-accent ${accentClass}" aria-hidden="true"></span>
      <div class="mentor-chat__quote-body">
        <span class="mentor-chat__quote-name">${replySenderLabel(replyTo)}</span>
        <span class="mentor-chat__quote-text">${escapeHtml(truncateReplyText(replyTo.body))}</span>
      </div>
    </div>
  `;
}

function renderReplyBarContent(replyTarget) {
  if (!replyTarget) return "";
  const roleClass = replyTarget.senderRole === "admin"
    ? "mentor-chat__reply-bar--mentor"
    : "mentor-chat__reply-bar--student";

  return `
    <div class="mentor-chat__reply-bar ${roleClass}" data-reply-bar>
      <span class="mentor-chat__reply-bar-accent" aria-hidden="true"></span>
      <div class="mentor-chat__reply-bar-content">
        <span class="mentor-chat__reply-bar-label">Replying to ${replySenderLabel(replyTarget)}</span>
        <span class="mentor-chat__reply-bar-text">${escapeHtml(truncateReplyText(replyTarget.body, 100))}</span>
      </div>
      <button type="button" class="mentor-chat__reply-bar-close" data-reply-cancel aria-label="Cancel reply">
        ${icon("close")}
      </button>
    </div>
  `;
}

export function getReplyTarget(container) {
  return container?._mentorChatReplyTarget || null;
}

export function setReplyTarget(container, message) {
  if (!container || !message?.id || message.pending) return;
  container._mentorChatReplyTarget = {
    id: message.id,
    body: message.body,
    senderName: message.senderName,
    senderRole: message.senderRole,
  };
  updateReplyBar(container);
  container.querySelector("[data-mentor-chat-form] textarea")?.focus();
}

export function clearReplyTarget(container) {
  if (!container) return;
  delete container._mentorChatReplyTarget;
  updateReplyBar(container);
}

export function updateReplyBar(container) {
  const form = container?.querySelector("[data-mentor-chat-form]");
  if (!form) return;

  let slot = form.querySelector("[data-reply-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.replySlot = "true";
    form.insertBefore(slot, form.firstChild);
  }

  const replyTarget = getReplyTarget(container);
  slot.innerHTML = replyTarget ? renderReplyBarContent(replyTarget) : "";
}

export function renderChatEmptyState() {
  return `
    <div class="mentor-chat__empty">
      ${icon("message")}
      <p>No messages yet. Say hello — your mentor will reply here.</p>
    </div>
  `;
}

export function renderChatMessage(msg, { viewerRole = "user" } = {}) {
  const isMine = msg.senderRole === "admin"
    ? viewerRole === "admin"
    : viewerRole !== "admin";
  const bubbleClass = isMine ? "mentor-chat__bubble--mine" : "mentor-chat__bubble--theirs";
  const roleLabel = msg.senderRole === "admin" ? "Mentor" : escapeHtml(msg.senderName || "Student");
  const pendingClass = msg.pending ? " mentor-chat__bubble--pending" : "";
  const replyQuote = msg.replyTo ? renderReplyQuote(msg.replyTo, { viewerRole }) : "";

  return `
    <div class="mentor-chat__message${isMine ? " mentor-chat__message--mine" : ""}" data-message-id="${escapeHtml(msg.id)}">
      <div class="mentor-chat__meta">
        <span class="mentor-chat__sender">${roleLabel}</span>
        <time class="mentor-chat__time" datetime="${msg.createdAt}">${formatChatTime(msg.createdAt)}</time>
      </div>
      <div class="mentor-chat__swipe-row" data-chat-swipe-row>
        <button type="button" class="mentor-chat__reply-action" data-chat-reply-btn aria-label="Reply" tabindex="-1">
          ${icon("reply")}
        </button>
        <div class="mentor-chat__swipe-track" data-chat-swipe-track>
          <div class="mentor-chat__bubble ${bubbleClass}${pendingClass}">
            ${replyQuote}
            <div class="mentor-chat__bubble-text">${escapeHtml(msg.body).replace(/\n/g, "<br>")}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderChatMessages(messages, { viewerRole = "user" } = {}) {
  if (!messages?.length) return renderChatEmptyState();
  return messages.map((msg) => renderChatMessage(msg, { viewerRole })).join("");
}

export function patchChatFeed(container, messages, { viewerRole = "user" } = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed) return;
  feed.innerHTML = renderChatMessages(messages, { viewerRole });
  scrollChatToBottom(container);
}

export function appendChatMessage(container, message, { viewerRole = "user" } = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed) return;
  feed.querySelector(".mentor-chat__empty")?.remove();
  feed.insertAdjacentHTML("beforeend", renderChatMessage(message, { viewerRole }));
  scrollChatToBottom(container);
}

export function replaceChatMessage(container, messageId, message, { viewerRole = "user" } = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed) return;
  const existing = feed.querySelector(`[data-message-id="${messageId}"]`);
  if (existing) {
    existing.outerHTML = renderChatMessage(message, { viewerRole });
    scrollChatToBottom(container);
  }
}

export function removeChatMessage(container, messageId) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed) return;
  feed.querySelector(`[data-message-id="${messageId}"]`)?.remove();
  if (!feed.querySelector("[data-message-id]")) {
    feed.innerHTML = renderChatEmptyState();
  }
}

function resetSwipeTrack(track) {
  if (!track) return;
  track.style.transform = "";
  track.closest("[data-chat-swipe-row]")?.classList.remove("is-swiping", "is-reply-ready");
}

function triggerReply(container, messageId, getMessages) {
  const messages = getMessages?.() || [];
  const message = messages.find((msg) => msg.id === messageId);
  if (!message || message.pending) return;
  setReplyTarget(container, message);
}

export function bindChatSwipeReply(container, { getMessages } = {}) {
  if (!container) return;
  if (getMessages) container._mentorChatGetMessages = getMessages;
  if (container.dataset.chatSwipeBound) return;
  container.dataset.chatSwipeBound = "true";

  let activeDrag = null;

  const finishDrag = (triggerReplyOnRelease = true) => {
    if (!activeDrag) return;
    const { track, offsetX, messageId } = activeDrag;
    if (triggerReplyOnRelease && offsetX >= SWIPE_REPLY_THRESHOLD) {
      triggerReply(container, messageId, container._mentorChatGetMessages);
    }
    resetSwipeTrack(track);
    activeDrag = null;
  };

  container.addEventListener("pointerdown", (e) => {
    const track = e.target.closest("[data-chat-swipe-track]");
    if (!track || !container.contains(track) || e.button !== 0) return;

    const messageEl = track.closest("[data-message-id]");
    if (!messageEl) return;

    activeDrag = {
      track,
      messageId: messageEl.dataset.messageId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      axis: null,
      pointerId: e.pointerId,
    };
    track.setPointerCapture(e.pointerId);
  });

  container.addEventListener("pointermove", (e) => {
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;

    const dx = e.clientX - activeDrag.startX;
    const dy = e.clientY - activeDrag.startY;

    if (!activeDrag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      activeDrag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (activeDrag.axis === "y") {
        activeDrag.track.releasePointerCapture(e.pointerId);
        activeDrag = null;
        return;
      }
    }

    if (activeDrag.axis !== "x") return;
    e.preventDefault();

    const offset = Math.max(0, Math.min(dx, SWIPE_MAX));
    activeDrag.offsetX = offset;
    activeDrag.track.style.transform = `translateX(${offset}px)`;
    const row = activeDrag.track.closest("[data-chat-swipe-row]");
    row?.classList.toggle("is-swiping", offset > 0);
    row?.classList.toggle("is-reply-ready", offset >= SWIPE_REPLY_THRESHOLD);
  });

  container.addEventListener("pointerup", (e) => {
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
    activeDrag.track.releasePointerCapture(e.pointerId);
    finishDrag(true);
  });

  container.addEventListener("pointercancel", (e) => {
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
    finishDrag(false);
  });

  container.addEventListener("click", (e) => {
    const replyBtn = e.target.closest("[data-chat-reply-btn]");
    if (!replyBtn || !container.contains(replyBtn)) return;
    e.preventDefault();
    const messageId = replyBtn.closest("[data-message-id]")?.dataset.messageId;
    if (messageId) triggerReply(container, messageId, container._mentorChatGetMessages);
  });

  container.addEventListener("click", (e) => {
    if (!e.target.closest("[data-reply-cancel]")) return;
    e.preventDefault();
    clearReplyTarget(container);
  });
}

export function unbindChatSwipeReply(container) {
  if (!container) return;
  delete container._mentorChatGetMessages;
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
      <div data-reply-slot></div>
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

    const replyTarget = getReplyTarget(container);
    const replyToId = replyTarget?.id || null;

    form.dataset.sending = "true";
    textarea.value = "";
    closeEmojiPickers(container);
    clearReplyTarget(container);
    textarea.focus();

    try {
      await container._mentorChatOnSubmit(body, { form, textarea, replyToId, replyTarget });
    } catch {
      if (!textarea.value.trim()) textarea.value = body;
      if (replyTarget) setReplyTarget(container, replyTarget);
    } finally {
      delete form.dataset.sending;
      textarea.focus();
    }
  });
}

export function unbindChatComposer(container) {
  if (!container) return;
  delete container._mentorChatOnSubmit;
  clearReplyTarget(container);
}

export function scrollChatToBottom(container) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (feed) feed.scrollTop = feed.scrollHeight;
}