/**
 * Mentor chat feed merge helpers (WhatsApp-style pagination)
 */

export const CHAT_INITIAL_LIMIT = 15;
export const CHAT_PAGE_LIMIT = 15;

export function getNewestMessageId(messages = []) {
  const last = messages.at(-1);
  return last?.id && !last.pending ? last.id : null;
}

export function getOldestMessageId(messages = []) {
  const first = messages.find((msg) => !msg.pending);
  return first?.id || null;
}

export function mergeIncomingMessages(existing = [], incoming = []) {
  if (!incoming.length) return existing;

  const seen = new Set(existing.map((msg) => msg.id));
  const merged = [...existing];

  for (const msg of incoming) {
    if (!msg?.id || seen.has(msg.id)) continue;
    merged.push(msg);
    seen.add(msg.id);
  }

  return merged.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function prependOlderMessages(existing = [], older = []) {
  if (!older.length) return existing;

  const seen = new Set(existing.map((msg) => msg.id));
  const prepended = older.filter((msg) => msg?.id && !seen.has(msg.id));
  if (!prepended.length) return existing;

  return [...prepended, ...existing];
}

export function applyReceiptPatches(messages = [], patches = []) {
  if (!patches.length) return messages;

  const patchMap = new Map(patches.map((patch) => [patch.id, patch]));
  let changed = false;

  const next = messages.map((msg) => {
    const patch = patchMap.get(msg.id);
    if (!patch) return msg;
    if (msg.deliveredAt === patch.deliveredAt && msg.readAt === patch.readAt) return msg;
    changed = true;
    return {
      ...msg,
      deliveredAt: patch.deliveredAt,
      readAt: patch.readAt,
    };
  });

  return changed ? next : messages;
}

export function isChatFeedNearBottom(feed, threshold = 80) {
  if (!feed) return true;
  return feed.scrollHeight - feed.scrollTop - feed.clientHeight < threshold;
}