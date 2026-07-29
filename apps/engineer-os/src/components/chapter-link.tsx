"use client";

import { cn } from "@/lib/utils";

/**
 * Chapter navigation via a real anchor href.
 * Full navigation is intentional so chapter opens reliably
 * even when client-side soft routing has issues.
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
  const href = `/textbook/${encodeURIComponent(slug)}`;

  return (
    <a href={href} className={cn("cursor-pointer no-underline", className)}>
      {children}
    </a>
  );
}
