/**
 * Authenticated media uploads to Cloudflare R2
 */

import {
  MediaStorageError,
  assertValidImageUpload,
  chatImageKey,
  deleteObject,
  isR2Configured,
  profilePhotoKey,
  publicUrlToKey,
  uploadObject,
} from "./r2-storage.js";
import {
  getOrCreateStudentThread,
  getOrCreateThreadForStudentId,
  MentorChatError,
} from "./mentor-chat-store.js";
import { connectDB } from "./db/mongodb.js";
import { MentorThread } from "./models/MentorThread.js";

export { MediaStorageError };

export async function uploadProfilePhotoForUser(user, buffer, contentType) {
  if (!isR2Configured()) {
    throw new MediaStorageError("Image storage is not configured.", { status: 503, code: "STORAGE_UNAVAILABLE" });
  }

  const type = assertValidImageUpload(buffer, contentType);
  const key = profilePhotoKey(user.id, type);
  const url = await uploadObject({ key, body: buffer, contentType: type });
  return { url, key };
}

export async function removeProfilePhotoForUser(user, currentUrl) {
  if (!currentUrl || !isR2Configured()) return { ok: true };
  const key = publicUrlToKey(currentUrl);
  if (!key || !key.startsWith(`users/${user.id}/avatar.`)) return { ok: true };
  await deleteObject(key);
  return { ok: true };
}

async function resolveUploadThread(user, { threadId, studentId }) {
  await connectDB();

  if (user.role === "admin") {
    const id = String(threadId || "").trim();
    if (id) {
      const thread = await MentorThread.findOne({ id }).lean();
      if (thread) return thread;
    }

    const sid = String(studentId || "").trim();
    if (sid) {
      return getOrCreateThreadForStudentId(sid);
    }

    throw new MentorChatError("Conversation not found.", { status: 404, code: "NOT_FOUND" });
  }

  const thread = await getOrCreateStudentThread(user);
  const id = String(threadId || "").trim();
  if (id && thread.id !== id) {
    throw new MentorChatError("Conversation not found.", { status: 404, code: "NOT_FOUND" });
  }
  return thread;
}

export async function uploadChatImageForUser(user, { threadId, studentId }, buffer, contentType) {
  if (!isR2Configured()) {
    throw new MediaStorageError("Image storage is not configured.", { status: 503, code: "STORAGE_UNAVAILABLE" });
  }

  const thread = await resolveUploadThread(user, { threadId, studentId });
  const type = assertValidImageUpload(buffer, contentType);
  const key = chatImageKey(thread.id, type);
  const url = await uploadObject({ key, body: buffer, contentType: type });
  return { url, key, threadId: thread.id };
}