/**
 * Mentor chat Socket.IO client — Phase 1 (message.new, thread.updated, message.send)
 */

import { getToken } from "../auth/session.js";
import { API_BASE_URL } from "../config.js";

const SOCKET_IO_CDN = "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
const SOCKET_PATH = "/socket.io";

let socket = null;
let connectPromise = null;
let ioFactory = null;
const eventHandlers = new Map();

function getSocketUrl() {
  const base = API_BASE_URL?.replace(/\/$/, "") ?? "";
  return base || window.location.origin;
}

async function loadIo() {
  if (ioFactory) return ioFactory;
  const mod = await import(SOCKET_IO_CDN);
  ioFactory = mod.io;
  return ioFactory;
}

function dispatchEvent(event, payload) {
  const handlers = eventHandlers.get(event);
  if (!handlers) return;
  handlers.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.warn("[mentor-chat-socket] handler error", err);
    }
  });
}

function wireSocket(sock) {
  sock.on("message.new", (payload) => dispatchEvent("message.new", payload));
  sock.on("thread.updated", (payload) => dispatchEvent("thread.updated", payload));
  sock.on("disconnect", () => dispatchEvent("disconnect", {}));
  sock.on("connect", () => dispatchEvent("connect", {}));
}

export function isMentorChatSocketConnected() {
  return Boolean(socket?.connected);
}

export function onMentorChatSocket(event, handler) {
  if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
  eventHandlers.get(event).add(handler);
  return () => eventHandlers.get(event)?.delete(handler);
}

export async function connectMentorChatSocket() {
  if (socket?.connected) return socket;
  if (connectPromise) return connectPromise;

  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  connectPromise = (async () => {
    const io = await loadIo();
    const sock = io(getSocketUrl(), {
      path: SOCKET_PATH,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
    });

    wireSocket(sock);

    await new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        sock.off("connect", onConnect);
        sock.off("connect_error", onError);
      };
      sock.once("connect", onConnect);
      sock.once("connect_error", onError);
    });

    socket = sock;
    return sock;
  })().catch((err) => {
    connectPromise = null;
    throw err;
  });

  return connectPromise;
}

export function disconnectMentorChatSocket() {
  socket?.disconnect();
  socket = null;
  connectPromise = null;
}

export function joinMentorThread(threadId) {
  if (!socket?.connected || !threadId) return;
  socket.emit("thread.join", { threadId });
}

export async function sendMentorChatMessage(payload) {
  const sock = await connectMentorChatSocket();
  return new Promise((resolve, reject) => {
    sock.timeout(15000).emit("message.send", payload, (ack) => {
      if (ack?.ok) {
        resolve(ack);
        return;
      }
      reject(new Error(ack?.error?.message || "Failed to send message."));
    });
  });
}