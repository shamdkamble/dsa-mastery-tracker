"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const swUrl = `${base}/sw.js`;

    navigator.serviceWorker.register(swUrl, { scope: `${base}/` || "/" }).catch(() => {
      /* SW optional in dev */
    });
  }, []);

  return null;
}
