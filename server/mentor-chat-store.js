/**
 * Mentor Desk — 1:1 student ↔ admin chat
 */

import { randomUUID } from "node:crypto";
import { connectDB } from "./db/mongodb.js";
import { MentorThread, toMentorThreadDto } from "./models/MentorThread.js";
import { MentorMessage, toMentorMessageDto } from "./models/MentorMessage.js";
import { createUserNotification } from "./notifications-db.js";
import { User } from "./models/User.js";

const ADMIN_INBOX_USER_ID = "admin";
const MAX_MESSAGE_LENGTH = 4000;
const MESSAGE_PAGE_SIZE = 200;

export class MentorChatError extends Error {
  constructor(message, { status = 400, code = "CHAT_ERROR" } = {}) {
    super(message);
    this.name = "MentorChatError";
    this.status = status;
    this.code = code;
  }
}

function preview(text) {
  const t = String(text || "").trim();
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

async function notifyAdmins(payload, pushTag) {
  const ids = new Set([ADMIN_INBOX_USER_ID]);
  try {
    const admins = await User.find({ role: "admin" }).select("id").lean();
    admins.forEach((a) => ids.add(a.id));
  } catch {
    /* ignore */
  }

  await Promise.all([...ids].map((userId) =>
    createUserNotification(userId, payload, { pushTag }).catch((err) => {
      console.warn("[mentor-chat] admin notify failed", userId, err?.message);
    }),
  ));
}

export async function getOrCreateStudentThread(student) {
  if (!student?.id) {
    throw new MentorChatError("Authentication required.", { status: 401, code: "UNAUTHORIZED" });
  }
  if (student.role === "admin") {
    throw new MentorChatError("Admins use Mentor Inbox.", { status: 403, code: "FORBIDDEN" });
  }

  await connectDB();
  let thread = await MentorThread.findOne({ studentId: student.id }).lean();
  if (thread) return toMentorThreadDto(thread);

  const now = new Date().toISOString();
  const doc = await MentorThread.create({
    id: `mthread_${randomUUID()}`,
    studentId: student.id,
    studentName: student.name || "",
    studentEmail: student.email || "",
    lastMessageAt: null,
    lastMessagePreview: "",
    lastSenderRole: null,
    unreadByAdmin: 0,
    unreadByStudent: 0,
    createdAt: now,
    updatedAt: now,
  });

  return toMentorThreadDto(doc);
}

async function getThreadMessages(threadId) {
  const docs = await MentorMessage.find({ threadId })
    .sort({ createdAt: 1 })
    .limit(MESSAGE_PAGE_SIZE)
    .lean();
  return docs.map(toMentorMessageDto);
}

export async function getStudentThreadView(student) {
  const thread = await getOrCreateStudentThread(student);
  const messages = await getThreadMessages(thread.id);

  if (thread.unreadByStudent > 0) {
    await MentorThread.updateOne({ id: thread.id }, {
      $set: { unreadByStudent: 0, updatedAt: new Date().toISOString() },
    });
    thread.unreadByStudent = 0;
  }

  return { thread, messages };
}

export async function sendStudentMessage(student, body) {
  const text = String(body || "").trim();
  if (!text) {
    throw new MentorChatError("Message cannot be empty.", { status: 400, code: "INVALID_INPUT" });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new MentorChatError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters).`, { status: 400, code: "INVALID_INPUT" });
  }

  const thread = await getOrCreateStudentThread(student);
  const now = new Date().toISOString();

  const message = await MentorMessage.create({
    id: `mmsg_${randomUUID()}`,
    threadId: thread.id,
    senderId: student.id,
    senderRole: student.role === "tester" ? "tester" : "user",
    senderName: student.name || "Student",
    body: text,
    createdAt: now,
  });

  await MentorThread.updateOne({ id: thread.id }, {
    $set: {
      lastMessageAt: now,
      lastMessagePreview: preview(text),
      lastSenderRole: student.role === "tester" ? "tester" : "user",
      studentName: student.name || thread.studentName,
      studentEmail: student.email || thread.studentEmail,
      updatedAt: now,
    },
    $inc: { unreadByAdmin: 1 },
  });

  await notifyAdmins({
    title: "New Mentor Desk message",
    text: `${student.name || "A student"}: ${preview(text)}`,
    variant: "accent",
    href: "#/admin-mentor-inbox",
  }, `mentor-chat-${thread.id}-${message.id}`);

  return toMentorMessageDto(message);
}

export async function listAdminThreads() {
  await connectDB();
  const docs = await MentorThread.find().sort({ lastMessageAt: -1, updatedAt: -1 }).lean();
  return docs.map(toMentorThreadDto);
}

export async function getAdminThreadView(threadId) {
  await connectDB();
  const thread = await MentorThread.findOne({ id: threadId }).lean();
  if (!thread) {
    throw new MentorChatError("Conversation not found.", { status: 404, code: "NOT_FOUND" });
  }

  const messages = await getThreadMessages(threadId);
  const dto = toMentorThreadDto(thread);

  if (dto.unreadByAdmin > 0) {
    await MentorThread.updateOne({ id: threadId }, {
      $set: { unreadByAdmin: 0, updatedAt: new Date().toISOString() },
    });
    dto.unreadByAdmin = 0;
  }

  return { thread: dto, messages };
}

export async function sendAdminMessage(admin, threadId, body) {
  const text = String(body || "").trim();
  if (!text) {
    throw new MentorChatError("Message cannot be empty.", { status: 400, code: "INVALID_INPUT" });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new MentorChatError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters).`, { status: 400, code: "INVALID_INPUT" });
  }

  await connectDB();
  const thread = await MentorThread.findOne({ id: threadId });
  if (!thread) {
    throw new MentorChatError("Conversation not found.", { status: 404, code: "NOT_FOUND" });
  }

  const now = new Date().toISOString();
  const message = await MentorMessage.create({
    id: `mmsg_${randomUUID()}`,
    threadId,
    senderId: admin.id,
    senderRole: "admin",
    senderName: admin.name || "Mentor",
    body: text,
    createdAt: now,
  });

  thread.lastMessageAt = now;
  thread.lastMessagePreview = preview(text);
  thread.lastSenderRole = "admin";
  thread.unreadByStudent = (thread.unreadByStudent || 0) + 1;
  thread.updatedAt = now;
  await thread.save();

  try {
    await createUserNotification(thread.studentId, {
      title: "Reply from your mentor",
      text: preview(text),
      variant: "info",
      href: "#/mentor-desk",
    }, { pushTag: `mentor-reply-${threadId}-${message.id}` });
  } catch (err) {
    console.warn("[mentor-chat] student notify failed", err?.message);
  }

  return toMentorMessageDto(message);
}

export async function getAdminInboxStats() {
  await connectDB();
  const threads = await MentorThread.find().lean();
  return {
    total: threads.length,
    unread: threads.filter((t) => (t.unreadByAdmin || 0) > 0).length,
    activeToday: threads.filter((t) => {
      if (!t.lastMessageAt) return false;
      return t.lastMessageAt.slice(0, 10) === new Date().toISOString().slice(0, 10);
    }).length,
  };
}