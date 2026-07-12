import { compressImageFile } from "../utils/image-compress.js";
import { uploadChatImage } from "../api/mediaApi.js";

export async function uploadPreparedChatImage(blob, mimeType, { threadId, studentId }) {
  return uploadChatImage(blob, mimeType, { threadId, studentId });
}

export async function compressAndUploadChatImage(file, { threadId, studentId }) {
  const { blob, mimeType } = await compressImageFile(file);
  const result = await uploadPreparedChatImage(blob, mimeType, { threadId, studentId });
  return { ...result, blob, mimeType };
}

export function buildOptimisticChatImageMessage({
  caption = "",
  imageUrl,
  replyToId,
  replyTarget,
  senderRole,
  senderName,
}) {
  return {
    id: `pending_${Date.now()}`,
    body: caption,
    imageUrl,
    messageType: "image",
    senderRole,
    senderName,
    createdAt: new Date().toISOString(),
    pending: true,
    ...(replyToId ? { replyToId } : {}),
    ...(replyTarget ? { replyTo: replyTarget } : {}),
  };
}