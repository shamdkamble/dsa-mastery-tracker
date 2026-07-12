/**
 * Client-side image compression — targets ≤200 KB before upload
 */

export const MAX_IMAGE_BYTES = 200 * 1024;
const MAX_DIMENSION = 1280;

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

function scaledSize(width, height, maxDim) {
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height };
  const scale = maxDim / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function encodeWithSettings(img, { maxDim, quality, mimeType }) {
  const { width, height } = scaledSize(img.naturalWidth, img.naturalHeight, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, mimeType, quality);
  return blob;
}

/**
 * @param {File} file
 * @param {number} [maxBytes]
 * @returns {Promise<{ blob: Blob, mimeType: string, size: number }>}
 */
export async function compressImageFile(file, maxBytes = MAX_IMAGE_BYTES) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const img = await loadImageElement(file);
  const attempts = [];
  const mimeTypes = ["image/webp", "image/jpeg"];

  for (const mimeType of mimeTypes) {
    for (const maxDim of [MAX_DIMENSION, 1024, 800, 640, 480]) {
      for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4]) {
        attempts.push({ maxDim, quality, mimeType });
      }
    }
  }

  let smallest = null;

  for (const attempt of attempts) {
    const blob = await encodeWithSettings(img, attempt);
    if (!blob) continue;
    if (!smallest || blob.size < smallest.blob.size) {
      smallest = { blob, mimeType: attempt.mimeType, size: blob.size };
    }
    if (blob.size <= maxBytes) {
      return { blob, mimeType: attempt.mimeType, size: blob.size };
    }
  }

  if (smallest?.blob) {
    throw new Error("Could not compress image below 200 KB. Try a smaller photo.");
  }

  throw new Error("Could not compress image.");
}