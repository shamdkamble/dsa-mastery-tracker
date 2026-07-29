"use client";

import { useEffect, useState } from "react";
import {
  getDsaMantraHomeUrl,
  getDsaMantraLoginUrl,
  getDsaSessionUser,
  requireDsaAdmin,
  verifyLiveAdminAccess,
  type DsaSessionUser,
} from "@/lib/dsa-mantra-auth";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, Database } from "lucide-react";

/**
 * Guards EngineerOS using the live DSA Mantra session + MongoDB-backed /api/auth/me.
 * Works from any device once you are logged into DSA Mantra as admin on the same domain.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const enforce = requireDsaAdmin();
  const [ready, setReady] = useState(!enforce);
  const [allowed, setAllowed] = useState(!enforce);
  const [user, setUser] = useState<DsaSessionUser | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!enforce) {
      setReady(true);
      setAllowed(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await verifyLiveAdminAccess();
      if (cancelled) return;
      setUser(result.user);
      setAllowed(result.ok);
      setError(result.error);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enforce]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh px-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          <p className="text-sm">Verifying DSA Mantra admin session…</p>
          <p className="flex items-center gap-1.5 text-xs text-zinc-600">
            <Database className="h-3.5 w-3.5" />
            Live API · same database as DSA Mantra
          </p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    const home = getDsaMantraHomeUrl();
    const login = getDsaMantraLoginUrl();
    const message =
      error === "not_logged_in" || error === "session_expired"
        ? "Sign in to DSA Mantra as an administrator, then open EngineerOS again from the Admin menu."
        : error === "not_admin"
          ? `Your account (${user?.email || user?.name || "unknown"}) is not an admin.`
          : error === "network"
            ? "Could not reach DSA Mantra API. Check your connection and try again."
            : "EngineerOS is reserved for DSA Mantra administrators.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh px-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-black/40 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin only</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{message}</p>
          <p className="mt-2 text-xs text-zinc-600">
            Uses the same login token and MongoDB users as live DSA Mantra.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild className="w-full">
              <a href={login}>Sign in to DSA Mantra</a>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <a href={home}>Back to Admin</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
