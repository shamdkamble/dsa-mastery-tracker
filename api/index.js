/**
 * Vercel serverless entry — routes /api/* to the Express app
 */

export { default } from "../server/index.js";

/** Allow up to 5 min for Gemini lesson generation (requires Vercel Pro). */
export const maxDuration = 300;