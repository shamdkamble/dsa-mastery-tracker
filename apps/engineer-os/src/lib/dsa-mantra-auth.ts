/**
 * Bridge to live DSA Mantra auth + MongoDB-backed sessions.
 *
 * Same keys as js/auth/session.js — works on the live DSA Mantra domain
 * because EngineerOS is served same-origin at /engineer-os/.
 */

export const DSA_AUTH_USER_KEY = "dsa-auth-user";
export const DSA_AUTH_TOKEN_KEY = "dsa-auth-token";

export type DsaSessionUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  status?: string;
  accessLevel?: string;
};

/** API origin for DSA Mantra (empty = same origin as this page). */
export function getDsaApiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_DSA_API_BASE || "").replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") {
    // Embedded at https://your-dsa-mantra.vercel.app/engineer-os → call same host /api/*
    return window.location.origin;
  }
  return "";
}

export function getDsaToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(DSA_AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getDsaSessionUser(): DsaSessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DSA_AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DsaSessionUser;
  } catch {
    return null;
  }
}

export function setDsaSessionUser(user: DsaSessionUser) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DSA_AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function isDsaAdminCached(): boolean {
  return getDsaSessionUser()?.role === "admin";
}

/**
 * Verify against live DSA Mantra API (/api/auth/me → MongoDB users).
 * This is the source of truth for production access from anywhere.
 */
export async function verifyLiveAdminAccess(): Promise<{
  ok: boolean;
  user: DsaSessionUser | null;
  error?: string;
}> {
  const token = getDsaToken();
  if (!token) {
    return { ok: false, user: null, error: "not_logged_in" };
  }

  const base = getDsaApiBase();
  try {
    const res = await fetch(`${base}/api/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (res.status === 401) {
      return { ok: false, user: null, error: "session_expired" };
    }
    if (!res.ok) {
      return { ok: false, user: null, error: `api_${res.status}` };
    }

    const data = (await res.json()) as { user?: DsaSessionUser };
    const user = data.user ?? null;
    if (user) setDsaSessionUser(user);

    if (user?.role === "admin") {
      return { ok: true, user };
    }
    return { ok: false, user, error: "not_admin" };
  } catch {
    // Offline / network: fall back to cached role only if admin was stored
    if (isDsaAdminCached()) {
      return { ok: true, user: getDsaSessionUser(), error: "offline_cached" };
    }
    return { ok: false, user: getDsaSessionUser(), error: "network" };
  }
}

/**
 * Admin required whenever we are embedded under DSA Mantra production path,
 * or when NEXT_PUBLIC_REQUIRE_DSA_ADMIN=true.
 */
export function requireDsaAdmin(): boolean {
  if (process.env.NEXT_PUBLIC_REQUIRE_DSA_ADMIN === "true") return true;
  if (process.env.NEXT_PUBLIC_REQUIRE_DSA_ADMIN === "false") return false;
  // Auto-enforce on live embed path
  if (typeof window !== "undefined") {
    return window.location.pathname.startsWith("/engineer-os");
  }
  // Embed builds always set REQUIRE at compile time
  return process.env.NEXT_PUBLIC_BASE_PATH === "/engineer-os";
}

export function getDsaMantraHomeUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_DSA_MANTRA_URL || "/#/admin";
  }
  const configured = process.env.NEXT_PUBLIC_DSA_MANTRA_URL;
  if (configured?.startsWith("http")) return configured;
  // Same live site — hash router home for admins
  return `${window.location.origin}/#/admin`;
}

export function getDsaMantraLoginUrl(): string {
  if (typeof window === "undefined") return "/#/login";
  return `${window.location.origin}/#/login`;
}

export function getEngineerOsPublicPath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}
