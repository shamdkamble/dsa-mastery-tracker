/**
 * Prefix app paths with Next.js basePath (e.g. /engineer-os on live DSA Mantra).
 * next/link and next/router already do this — use this only for raw <a href> / location.assign.
 */
export function getBasePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
}

/** Join basePath + path. Path must start with /. */
export function withBasePath(path: string): string {
  const base = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  // Avoid double-prefix
  if (normalized === base || normalized.startsWith(`${base}/`)) return normalized;
  return `${base}${normalized}`;
}
