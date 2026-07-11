/**
 * Mentor chat — Socket.IO real-time layer (Phase 1: message.new + thread.updated)
 */

import { Server } from "socket.io";
import { verifyToken, getCurrentUser } from "./auth.js";
import {
  MentorChatError,
  sendStudentMessage,
  sendAdminMessage,
  sendAdminMessageToStudent,
  getOrCreateStudentThread,
} from "./mentor-chat-store.js";
import { MentorThread } from "./models/MentorThread.js";
import { connectDB } from "./db/mongodb.js";

export const THREAD_ROOM_PREFIX = "thread:";
export const ADMIN_INBOX_ROOM = "admin-inbox";

let chatIo = null;

export function threadRoom(threadId) {
  return `${THREAD_ROOM_PREFIX}${threadId}`;
}

function joinAdminsToThread(threadId) {
  if (!chatIo) return;
  const admins = chatIo.sockets.adapter.rooms.get(ADMIN_INBOX_ROOM);
  if (!admins) return;
  admins.forEach((socketId) => {
    chatIo.sockets.sockets.get(socketId)?.join(threadRoom(threadId));
  });
}

export function broadcastChatEvents({ message, thread }, { excludeSocketId } = {}) {
  if (!chatIo || !message || !thread?.id) return;

  const payload = { message, threadId: thread.id };
  const room = threadRoom(thread.id);

  if (excludeSocketId) {
    chatIo.to(room).except(excludeSocketId).emit("message.new", payload);
  } else {
    chatIo.to(room).emit("message.new", payload);
  }

  chatIo.to(ADMIN_INBOX_ROOM).emit("thread.updated", { thread });
}

async function joinUserRooms(socket) {
  const user = socket.data.user;

  if (user.role === "admin") {
    socket.join(ADMIN_INBOX_ROOM);
    await connectDB();
    const threads = await MentorThread.find().select("id").lean();
    threads.forEach((t) => socket.join(threadRoom(t.id)));
    return;
  }

  const thread = await getOrCreateStudentThread(user);
  socket.data.threadId = thread.id;
  socket.join(threadRoom(thread.id));
}

async function handleMessageSend(socket, payload = {}) {
  const user = socket.data.user;
  const body = payload.body;
  const clientId = payload.clientId || null;

  let result;

  if (user.role === "admin") {
    if (payload.threadId) {
      result = await sendAdminMessage(user, payload.threadId, body);
    } else if (payload.studentId) {
      result = await sendAdminMessageToStudent(user, payload.studentId, body);
    } else {
      throw new MentorChatError("threadId or studentId is required.", { status: 400, code: "INVALID_INPUT" });
    }
    joinAdminsToThread(result.thread.id);
  } else {
    result = await sendStudentMessage(user, body);
    socket.data.threadId = result.thread.id;
    socket.join(threadRoom(result.thread.id));
  }

  broadcastChatEvents(result, { excludeSocketId: socket.id });

  return { ...result, clientId };
}

function socketError(err) {
  if (err instanceof MentorChatError) {
    return { message: err.message, code: err.code };
  }
  return { message: err?.message || "Chat error.", code: "CHAT_ERROR" };
}

export function attachMentorChatSocket(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
  });

  chatIo = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.query?.token;
      verifyToken(token);
      const user = await getCurrentUser(token);
      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error(err?.message || "Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    void joinUserRooms(socket).catch((err) => {
      console.warn("[mentor-chat-socket] room join failed", err?.message);
    });

    socket.on("thread.join", async (payload = {}) => {
      if (socket.data.user?.role !== "admin") return;
      const threadId = payload.threadId;
      if (!threadId) return;
      socket.join(threadRoom(threadId));
    });

    socket.on("message.send", async (payload = {}, ack) => {
      try {
        const result = await handleMessageSend(socket, payload);
        if (typeof ack === "function") {
          ack({ ok: true, message: result.message, thread: result.thread, clientId: result.clientId });
        }
      } catch (err) {
        console.warn("[mentor-chat-socket] message.send failed", err?.message);
        if (typeof ack === "function") {
          ack({ ok: false, error: socketError(err) });
        }
      }
    });
  });

  return io;
}