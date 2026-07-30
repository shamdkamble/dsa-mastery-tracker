/**
 * EngineerOS progress API — same DSA Mantra host + JWT.
 */

import { getDsaApiBase, getDsaToken } from "./dsa-mantra-auth";
import type { ProgressState } from "./types";
import { DEFAULT_PROGRESS } from "./types";

export type RemoteProgress = ProgressState & {
  userId?: string | null;
  updatedAt?: string | null;
  source?: string;
};

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getDsaToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function stripServerFields(p: RemoteProgress): ProgressState {
  const {
    userId: _u,
    updatedAt: _a,
    source: _s,
    ...rest
  } = p as ProgressState & {
    userId?: string | null;
    updatedAt?: string | null;
    source?: string;
  };
  return { ...DEFAULT_PROGRESS, ...rest };
}

/**
 * Load progress from MongoDB via DSA Mantra API.
 * Returns null if unauthenticated or request failed (caller may use local cache).
 */
export async function fetchRemoteProgress(): Promise<ProgressState | null> {
  const token = getDsaToken();
  if (!token) return null;

  const base = getDsaApiBase();
  try {
    const res = await fetch(`${base}/api/engineer-os/progress`, {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { progress?: RemoteProgress };
    if (!data.progress) return { ...DEFAULT_PROGRESS };
    return stripServerFields(data.progress);
  } catch {
    return null;
  }
}

/** Persist full progress document to MongoDB. */
export async function saveRemoteProgress(
  progress: ProgressState
): Promise<{ ok: boolean; error?: string }> {
  const token = getDsaToken();
  if (!token) return { ok: false, error: "not_authenticated" };

  const base = getDsaApiBase();
  try {
    const res = await fetch(`${base}/api/engineer-os/progress`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(progress),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: text || `http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network" };
  }
}

export async function resetRemoteProgress(): Promise<boolean> {
  const token = getDsaToken();
  if (!token) return false;
  const base = getDsaApiBase();
  try {
    const res = await fetch(`${base}/api/engineer-os/progress`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Prefer the document that has more learning activity. */
export function pickRicherProgress(a: ProgressState, b: ProgressState): ProgressState {
  const score = (p: ProgressState) =>
    (p.chaptersCompleted?.length || 0) * 10 +
    (p.dailyMissionsCompleted?.length || 0) * 5 +
    (p.leetcodeSolved || 0) * 2 +
    (p.journal?.length || 0) +
    (p.mistakes?.length || 0) +
    (p.hoursStudiedMinutes || 0) / 60 +
    (p.started ? 1 : 0) +
    (p.week1Complete ? 20 : 0);

  return score(a) >= score(b) ? a : b;
}
