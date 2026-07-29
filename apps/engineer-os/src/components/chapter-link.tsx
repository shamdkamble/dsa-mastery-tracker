"use client";

import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";

/**
 * Chapter navigation for static export under /engineer-os.
 * Uses a real <a href> with basePath so Vercel never 404s on bare /textbook/*.
 * (next/link soft nav can still fail on pure static hosts; full navigation is reliable.)
 */
export function ChapterLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: React.ReactNode;
}) {
  const href = withBasePath(`/textbook/${encodeURIComponent(slug)}/`);

  return (
    <a href={href} className={cn("cursor-pointer no-underline", className)}>
      {children}
    </a>
  );
}
