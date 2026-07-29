/**
 * Frontend configuration
 * API key lives on the server — set GEMINI_API_KEY in your environment (see .env.example).
 */

/** Base URL for API calls. Empty string = same origin (recommended). */
export const API_BASE_URL = "";

/** Default Gemini model (server-side; mirrored here for reference only). */
export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * EngineerOS — detailed interview learning OS (admin only).
 *
 * ALWAYS same-origin `/engineer-os/` so:
 * - live DSA Mantra session (localStorage token) is shared
 * - `/api/auth/me` hits the same MongoDB-backed API
 * - works from any device the same way DSA Mantra does
 *
 * Override only for emergency: window.__ENGINEER_OS_URL__
 */
export function getEngineerOsUrl() {
  if (typeof window !== "undefined" && window.__ENGINEER_OS_URL__) {
    return String(window.__ENGINEER_OS_URL__);
  }
  if (typeof window === "undefined") return "/engineer-os/";
  // Same host as live DSA Mantra (production, preview, or local serve)
  return `${window.location.origin}/engineer-os/`;
}
