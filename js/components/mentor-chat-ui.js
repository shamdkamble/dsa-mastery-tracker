/**
 * Shared mentor chat UI helpers
 */

import { icon } from "./icons.js";

const CHAT_EMOJIS = [
  "👍", "👎", "👋", "🙏", "❤️", "😊", "😂", "😅", "🤔", "🎉",
  "🔥", "✅", "❓", "💡", "⭐", "🚀", "💪", "🎯", "👏", "😎",
  "🙌", "✨", "📚", "💯", "⚡", "🙂", "😢", "😮", "🤝", "☕",
];

const SWIPE_REPLY_THRESHOLD = 52;
const SWIPE_MAX = 76;
const LONG_PRESS_MS = 480;

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

function truncateReplyText(message, max = 120) {
  const body = typeof message === "string" ? message : message?.body;
  const imageUrl = typeof message === "object" ? message?.imageUrl : null;
  const text = String(body || "").trim().replace(/\s+/g, " ");
  const label = text || (imageUrl ? "Photo" : "");
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function replySenderLabel(replyTo) {
  return replyTo.senderRole === "admin" ? "Mentor" : escapeHtml(replyTo.senderName || "Student");
}

function isOutgoingMessage(msg, viewerRole = "user") {
  return msg.senderRole === "admin"
    ? viewerRole === "admin"
    : viewerRole !== "admin";
}

export function getMessageReceiptStatus(msg, { viewerRole = "user" } = {}) {
  if (!msg || msg.pending || !isOutgoingMessage(msg, viewerRole)) return null;
  if (msg.readAt) return "read";
  if (msg.deliveredAt) return "delivered";
  return "sent";
}

function receiptAriaLabel(status) {
  if (status === "read") return "Read";
  if (status === "delivered") return "Delivered";
  return "Sent";
}

function renderReceiptTicks(status) {
  if (status === "sent") {
    return `
      <svg class="mentor-chat__receipt-icon" viewBox="0 0 16 11" aria-hidden="true">
        <path d="M1 6.2 L4.8 9.8 L14.2 1.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  return `
    <svg class="mentor-chat__receipt-icon mentor-chat__receipt-icon--double" viewBox="0 0 20 11" aria-hidden="true">
      <path d="M1 6.2 L4.2 9.4 L12.2 1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5.5 6.2 L8.7 9.4 L18.2 1.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function renderMessageReceipt(msg, { viewerRole = "user" } = {}) {
  if (msg.pending) {
    return `<span class="mentor-chat__receipt mentor-chat__receipt--pending" aria-label="Sending">${renderReceiptTicks("sent")}</span>`;
  }

  const status = getMessageReceiptStatus(msg, { viewerRole });
  if (!status) return "";

  return `
    <span class="mentor-chat__receipt mentor-chat__receipt--${status}" aria-label="${receiptAriaLabel(status)}">
      ${renderReceiptTicks(status)}
    </span>
  `;
}

function messageReceiptSignature(msg, viewerRole) {
  if (!isOutgoingMessage(msg, viewerRole) || msg.pending) return "";
  return `${msg.deliveredAt || ""}|${msg.readAt || ""}`;
}

export function chatMessagesChanged(prevMessages = [], nextMessages = [], { viewerRole = "user" } = {}) {
  if (prevMessages.length !== nextMessages.length) return true;
  if (prevMessages.at(-1)?.id !== nextMessages.at(-1)?.id) return true;
  if (prevMessages[0]?.id !== nextMessages[0]?.id) return true;

  for (let i = 0; i < prevMessages.length; i += 1) {
    const prev = prevMessages[i];
    const next = nextMessages[i];
    if (prev.id !== next.id) return true;
    if (prev.imageUrl !== next.imageUrl) return true;
    if (prev.body !== next.body) return true;
    if (messageReceiptSignature(prev, viewerRole) !== messageReceiptSignature(next, viewerRole)) {
      return true;
    }
  }

  return false;
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
    <button
      type="button"
      class="mentor-chat__quote ${roleClass}"
      data-jump-to-message="${escapeHtml(replyTo.id)}"
      aria-label="Jump to message from ${replySenderLabel(replyTo)}"
    >
      <span class="mentor-chat__quote-accent ${accentClass}" aria-hidden="true"></span>
      <div class="mentor-chat__quote-body">
        <span class="mentor-chat__quote-label">Replying to ${replySenderLabel(replyTo)}</span>
        <span class="mentor-chat__quote-text">${escapeHtml(truncateReplyText(replyTo))}</span>
      </div>
    </button>
  `;
}

function renderReplyBarContent(replyTarget) {
  if (!replyTarget) return "";
  const roleClass = replyTarget.senderRole === "admin"
    ? "mentor-chat__reply-bar--mentor"
    : "mentor-chat__reply-bar--student";

  return `
    <div class="mentor-chat__reply-bar ${roleClass}" data-reply-bar>
      <span class="mentor-chat__reply-bar-icon" aria-hidden="true">${icon("reply")}</span>
      <span class="mentor-chat__reply-bar-accent" aria-hidden="true"></span>
      <div class="mentor-chat__reply-bar-content">
        <span class="mentor-chat__reply-bar-label">Replying to ${replySenderLabel(replyTarget)}</span>
        <span class="mentor-chat__reply-bar-text">${escapeHtml(truncateReplyText(replyTarget, 100))}</span>
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

export function scrollToChatMessage(container, messageId, { highlight = true } = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  const el = feed?.querySelector(`[data-message-id="${messageId}"]`);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (highlight) {
    el.classList.add("is-reply-highlight");
    window.setTimeout(() => el.classList.remove("is-reply-highlight"), 1400);
  }
  return true;
}

function highlightReplySource(container, messageId) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  feed?.querySelectorAll(".is-reply-source").forEach((el) => el.classList.remove("is-reply-source"));
  const el = feed?.querySelector(`[data-message-id="${messageId}"]`);
  el?.classList.add("is-reply-source");
}

function resetComposerPlaceholder(container) {
  const textarea = container?.querySelector("[data-mentor-chat-form] textarea");
  if (!textarea) return;
  const defaultPlaceholder = textarea.dataset.defaultPlaceholder || textarea.getAttribute("placeholder") || "Type a message";
  textarea.dataset.defaultPlaceholder = defaultPlaceholder;
  textarea.placeholder = defaultPlaceholder;
}

export function setReplyTarget(container, message) {
  if (!container || !message?.id || message.pending) return;

  container._mentorChatReplyTarget = {
    id: message.id,
    body: message.body,
    imageUrl: message.imageUrl || null,
    senderName: message.senderName,
    senderRole: message.senderRole,
  };

  highlightReplySource(container, message.id);
  scrollToChatMessage(container, message.id, { highlight: true });
  updateReplyBar(container);

  const textarea = container.querySelector("[data-mentor-chat-form] textarea");
  if (textarea) {
    const label = message.senderRole === "admin" ? "Mentor" : (message.senderName || "Student");
    textarea.dataset.defaultPlaceholder = textarea.dataset.defaultPlaceholder
      || textarea.getAttribute("placeholder")
      || "Type a message";
    textarea.placeholder = `Reply to ${label}…`;
    textarea.focus();
  }
}

export function clearReplyTarget(container) {
  if (!container) return;
  delete container._mentorChatReplyTarget;
  container.querySelector("[data-mentor-chat-feed]")
    ?.querySelectorAll(".is-reply-source")
    .forEach((el) => el.classList.remove("is-reply-source"));
  updateReplyBar(container);
  resetComposerPlaceholder(container);
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
  if (replyTarget) highlightReplySource(container, replyTarget.id);
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
  const isMine = isOutgoingMessage(msg, viewerRole);
  const isReply = Boolean(msg.replyToId || msg.replyTo);
  const bubbleClass = isMine ? "mentor-chat__bubble--mine" : "mentor-chat__bubble--theirs";
  const roleLabel = msg.senderRole === "admin" ? "Mentor" : escapeHtml(msg.senderName || "Student");
  const pendingClass = msg.pending ? " mentor-chat__bubble--pending" : "";
  const replyQuote = msg.replyTo ? renderReplyQuote(msg.replyTo, { viewerRole }) : "";
  const receipt = renderMessageReceipt(msg, { viewerRole });
  const imageBlock = msg.imageUrl
    ? `<a class="mentor-chat__image-link" href="${escapeHtml(msg.imageUrl)}" target="_blank" rel="noopener noreferrer">
        <img class="mentor-chat__image" src="${escapeHtml(msg.imageUrl)}" alt="Shared image" loading="lazy">
      </a>`
    : "";
  const textBlock = msg.body
    ? `<div class="mentor-chat__bubble-text">${escapeHtml(msg.body).replace(/\n/g, "<br>")}</div>`
    : "";

  return `
    <div
      class="mentor-chat__message${isMine ? " mentor-chat__message--mine" : ""}${isReply ? " mentor-chat__message--is-reply" : ""}"
      data-message-id="${escapeHtml(msg.id)}"
      ${msg.replyToId ? `data-reply-to="${escapeHtml(msg.replyToId)}"` : ""}
    >
      ${isReply ? `<div class="mentor-chat__thread-connector" aria-hidden="true"></div>` : ""}
      ${isMine ? "" : `
        <div class="mentor-chat__meta">
          <span class="mentor-chat__sender">${roleLabel}</span>
          <time class="mentor-chat__time" datetime="${msg.createdAt}">${formatChatTime(msg.createdAt)}</time>
        </div>
      `}
      <div class="mentor-chat__swipe-row" data-chat-swipe-row>
        <button type="button" class="mentor-chat__reply-action" data-chat-reply-btn aria-label="Reply" tabindex="-1">
          ${icon("reply")}
        </button>
        <div class="mentor-chat__swipe-track" data-chat-swipe-track>
          <div class="mentor-chat__bubble ${bubbleClass}${pendingClass}${msg.imageUrl ? " mentor-chat__bubble--image" : ""}" draggable="false">
            ${replyQuote}
            ${imageBlock}
            ${textBlock}
          </div>
        </div>
      </div>
      ${isMine ? `
        <div class="mentor-chat__footer">
          <time class="mentor-chat__time" datetime="${msg.createdAt}">${formatChatTime(msg.createdAt)}</time>
          ${receipt}
        </div>
      ` : ""}
    </div>
  `;
}

export function renderChatMessages(messages, { viewerRole = "user" } = {}) {
  if (!messages?.length) return renderChatEmptyState();
  return messages.map((msg) => renderChatMessage(msg, { viewerRole })).join("");
}

export function renderChatLoadOlder({ loading = false, hasMore = false } = {}) {
  if (!hasMore) return "";
  return `
    <div class="mentor-chat__load-older" data-chat-load-older>
      ${loading
        ? `<span class="mentor-chat__load-older-spinner" aria-hidden="true"></span><span>Loading older messages…</span>`
        : `<span>Scroll up for older messages</span>`}
    </div>
  `;
}

export function renderChatFeedContent(messages, {
  viewerRole = "user",
  hasMoreOlder = false,
  loadingOlder = false,
} = {}) {
  const loadOlder = renderChatLoadOlder({ hasMore: hasMoreOlder, loading: loadingOlder });
  const body = messages?.length
    ? renderChatMessages(messages, { viewerRole })
    : renderChatEmptyState();
  return `${loadOlder}${body}`;
}

export function updateChatLoadOlder(container, { hasMore = false, loading = false } = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed) return;

  const existing = feed.querySelector("[data-chat-load-older]");
  if (!hasMore) {
    existing?.remove();
    return;
  }

  const html = renderChatLoadOlder({ hasMore, loading });
  if (existing) {
    existing.outerHTML = html;
  } else {
    feed.insertAdjacentHTML("afterbegin", html);
  }
}

export function prependChatMessages(container, messages, { viewerRole = "user" } = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed || !messages?.length) return;

  const scrollHeightBefore = feed.scrollHeight;
  const scrollTopBefore = feed.scrollTop;
  const loadOlderEl = feed.querySelector("[data-chat-load-older]");
  const html = messages.map((msg) => renderChatMessage(msg, { viewerRole })).join("");

  if (loadOlderEl) {
    loadOlderEl.insertAdjacentHTML("afterend", html);
  } else {
    feed.insertAdjacentHTML("afterbegin", html);
  }

  feed.scrollTop = scrollTopBefore + (feed.scrollHeight - scrollHeightBefore);
}

export function appendNewChatMessages(container, messages, {
  viewerRole = "user",
  autoScrollIfNearBottom = true,
} = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed || !messages?.length) return false;

  const wasNearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 80;

  feed.querySelector(".mentor-chat__empty")?.remove();

  let appended = false;
  for (const msg of messages) {
    if (!msg?.id || feed.querySelector(`[data-message-id="${msg.id}"]`)) continue;
    feed.insertAdjacentHTML("beforeend", renderChatMessage(msg, { viewerRole }));
    appended = true;
  }

  if (appended && autoScrollIfNearBottom && wasNearBottom) {
    scrollChatToBottom(container);
  }

  return appended;
}

export function patchMessageReceipts(container, messages, { viewerRole = "user" } = {}) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (!feed || !messages?.length) return;

  for (const msg of messages) {
    const el = feed.querySelector(`[data-message-id="${msg.id}"]`);
    if (!el) continue;

    const footer = el.querySelector(".mentor-chat__footer");
    if (!footer) continue;

    const receiptHtml = renderMessageReceipt(msg, { viewerRole });
    const existingReceipt = footer.querySelector(".mentor-chat__receipt");

    if (existingReceipt) {
      if (receiptHtml) existingReceipt.outerHTML = receiptHtml;
      else existingReceipt.remove();
    } else if (receiptHtml) {
      footer.insertAdjacentHTML("beforeend", receiptHtml);
    }
  }
}

export function bindChatScrollLoad(container, { onLoadOlder, getHasMore } = {}) {
  if (!container || container.dataset.chatScrollLoadBound) return;
  container.dataset.chatScrollLoadBound = "true";

  const feed = container.querySelector("[data-mentor-chat-feed]");
  if (!feed || !onLoadOlder) return;

  let loadingOlder = false;

  const maybeLoadOlder = () => {
    if (loadingOlder || !getHasMore?.()) return;
    if (feed.scrollTop > 48) return;

    loadingOlder = true;
    updateChatLoadOlder(container, { hasMore: true, loading: true });

    Promise.resolve(onLoadOlder())
      .finally(() => {
        loadingOlder = false;
        updateChatLoadOlder(container, { hasMore: getHasMore?.(), loading: false });
      });
  };

  feed.addEventListener("scroll", maybeLoadOlder, { passive: true });
  container._mentorChatScrollLoadHandler = maybeLoadOlder;
}

export function unbindChatScrollLoad(container) {
  if (!container) return;
  const feed = container.querySelector("[data-mentor-chat-feed]");
  if (feed && container._mentorChatScrollLoadHandler) {
    feed.removeEventListener("scroll", container._mentorChatScrollLoadHandler);
  }
  delete container._mentorChatScrollLoadHandler;
  delete container.dataset.chatScrollLoadBound;
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
  if (!message || message.pending) return false;
  setReplyTarget(container, message);
  return true;
}

function getSwipeMessageEl(target) {
  return target?.closest("[data-message-id]");
}

function isChatGestureTarget(target) {
  return Boolean(target?.closest("[data-mentor-chat-feed] [data-chat-swipe-row], [data-mentor-chat-feed] .mentor-chat__quote"));
}

function bindFeedGestureGuards(container) {
  if (!container || container.dataset.gestureGuardsBound) return;
  container.dataset.gestureGuardsBound = "true";

  container.addEventListener("selectstart", (e) => {
    if (isChatGestureTarget(e.target)) e.preventDefault();
  });

  container.addEventListener("dragstart", (e) => {
    if (isChatGestureTarget(e.target)) e.preventDefault();
  });

  container.addEventListener("contextmenu", (e) => {
    if (e.target.closest("[data-mentor-chat-feed] [data-chat-swipe-row]")) e.preventDefault();
  });
}

export function bindChatSwipeReply(container, { getMessages } = {}) {
  if (!container) return;
  if (getMessages) container._mentorChatGetMessages = getMessages;
  if (container.dataset.chatSwipeBound) return;
  container.dataset.chatSwipeBound = "true";

  bindFeedGestureGuards(container);
  const feed = container.querySelector("[data-mentor-chat-feed]");

  let activeDrag = null;
  let longPressTimer = null;
  let suppressClickUntil = 0;

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const finishDrag = (triggerReplyOnRelease = true) => {
    if (!activeDrag) return;
    const { track, offsetX, messageId, didTrigger } = activeDrag;

    if (!didTrigger && triggerReplyOnRelease && offsetX >= SWIPE_REPLY_THRESHOLD) {
      if (triggerReply(container, messageId, container._mentorChatGetMessages)) {
        suppressClickUntil = Date.now() + 350;
        if (navigator.vibrate) navigator.vibrate(12);
      }
    }

    resetSwipeTrack(track);
    feed?.classList.remove("is-gesture-active");
    activeDrag = null;
  };

  container.addEventListener("pointerdown", (e) => {
    const messageEl = getSwipeMessageEl(e.target);
    const track = messageEl?.querySelector("[data-chat-swipe-track]");
    if (!track || !container.contains(track) || e.button !== 0) return;
    if (e.target.closest("[data-jump-to-message], [data-chat-reply-btn]")) return;

    clearLongPress();
    const messageId = messageEl.dataset.messageId;

    activeDrag = {
      track,
      messageId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      axis: null,
      pointerId: e.pointerId,
      didTrigger: false,
    };

    longPressTimer = window.setTimeout(() => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
      if (triggerReply(container, messageId, container._mentorChatGetMessages)) {
        activeDrag.didTrigger = true;
        suppressClickUntil = Date.now() + 400;
        if (navigator.vibrate) navigator.vibrate(18);
        finishDrag(false);
      }
    }, LONG_PRESS_MS);

    track.setPointerCapture(e.pointerId);
  }, true);

  container.addEventListener("pointermove", (e) => {
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;

    const dx = e.clientX - activeDrag.startX;
    const dy = e.clientY - activeDrag.startY;

    if (!activeDrag.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      activeDrag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (activeDrag.axis === "y") {
        clearLongPress();
        try { activeDrag.track.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        activeDrag = null;
        return;
      }
      clearLongPress();
      feed?.classList.add("is-gesture-active");
    }

    if (activeDrag.axis !== "x") return;
    e.preventDefault();

    const offset = Math.max(0, Math.min(dx, SWIPE_MAX));
    activeDrag.offsetX = offset;
    activeDrag.track.style.transform = `translateX(${offset}px)`;
    const row = activeDrag.track.closest("[data-chat-swipe-row]");
    row?.classList.toggle("is-swiping", offset > 0);
    row?.classList.toggle("is-reply-ready", offset >= SWIPE_REPLY_THRESHOLD);
  }, { passive: false });

  container.addEventListener("pointerup", (e) => {
    clearLongPress();
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
    try { activeDrag.track.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    finishDrag(true);
  });

  container.addEventListener("pointercancel", (e) => {
    clearLongPress();
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
    finishDrag(false);
  });

  container.addEventListener("click", (e) => {
    if (Date.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const jumpBtn = e.target.closest("[data-jump-to-message]");
    if (jumpBtn && container.contains(jumpBtn)) {
      e.preventDefault();
      scrollToChatMessage(container, jumpBtn.dataset.jumpToMessage, { highlight: true });
      return;
    }

    const replyBtn = e.target.closest("[data-chat-reply-btn]");
    if (replyBtn && container.contains(replyBtn)) {
      e.preventDefault();
      const messageId = replyBtn.closest("[data-message-id]")?.dataset.messageId;
      if (messageId) triggerReply(container, messageId, container._mentorChatGetMessages);
      return;
    }

    if (e.target.closest("[data-reply-cancel]")) {
      e.preventDefault();
      clearReplyTarget(container);
    }
  }, true);
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
        <label class="mentor-chat__attach-btn" aria-label="Attach image">
          ${icon("image")}
          <input
            type="file"
            accept="image/*"
            data-chat-image-input
            class="mentor-chat__attach-input"
            ${disabled ? "disabled" : ""}
            hidden
          >
        </label>
        <div class="mentor-chat__input-wrap">
          <textarea
            class="mentor-chat__input"
            name="body"
            rows="1"
            placeholder="${escapeHtml(placeholder)}"
            data-default-placeholder="${escapeHtml(placeholder)}"
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

export function bindChatComposer(container, { onSubmit, onImageAttach } = {}) {
  if (!container) return;
  if (onSubmit) container._mentorChatOnSubmit = onSubmit;
  if (onImageAttach) container._mentorChatOnImageAttach = onImageAttach;
  if (container.dataset.chatComposerBound) return;
  container.dataset.chatComposerBound = "true";

  container.addEventListener("change", async (e) => {
    const input = e.target.closest("[data-chat-image-input]");
    if (!input || !container._mentorChatOnImageAttach) return;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const form = input.closest("[data-mentor-chat-form]");
    if (form?.dataset.sending === "true") return;

    const textarea = form?.querySelector("textarea");
    const caption = textarea?.value?.trim() || "";
    const replyTarget = getReplyTarget(container);
    const replyToId = replyTarget?.id || null;

    form.dataset.sending = "true";
    if (textarea) textarea.value = "";
    closeEmojiPickers(container);
    clearReplyTarget(container);

    try {
      await container._mentorChatOnImageAttach(file, { caption, replyToId, replyTarget, form, textarea });
    } catch {
      if (textarea && caption && !textarea.value.trim()) textarea.value = caption;
      if (replyTarget) setReplyTarget(container, replyTarget);
    } finally {
      delete form?.dataset.sending;
      textarea?.focus();
    }
  });

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
  delete container._mentorChatOnImageAttach;
  clearReplyTarget(container);
}

export function scrollChatToBottom(container) {
  const feed = container?.querySelector("[data-mentor-chat-feed]");
  if (feed) feed.scrollTop = feed.scrollHeight;
}