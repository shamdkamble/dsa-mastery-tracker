"use client";

import { USER_PROFILE } from "@/data/profile";
import { getQuoteForPage } from "@/data/quotes";
import { cn } from "@/lib/utils";

export function MotivationBar({
  pageKey,
  className,
  compact = false,
}: {
  pageKey: string;
  className?: string;
  compact?: boolean;
}) {
  const quote = getQuoteForPage(pageKey);
  return (
    <div
      className={cn(
        "glass rounded-2xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span className="text-zinc-500">Goal</span>
        {USER_PROFILE.dreamCompanies.map((c) => (
          <span
            key={c}
            className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-zinc-200"
          >
            {c}
          </span>
        ))}
        <span className="text-indigo-300 font-semibold tracking-wide">
          {USER_PROFILE.currentMission}
        </span>
        <span className="text-cyan-300/90 font-medium">{USER_PROFILE.dreamPackage}</span>
      </div>
      {!compact && (
        <p className="text-xs text-zinc-400 italic max-w-md sm:text-right">
          “{quote.text}” — {quote.author}
        </p>
      )}
    </div>
  );
}
