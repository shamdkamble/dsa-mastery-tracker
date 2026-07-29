"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress-store";
import { getChapterById } from "@/data/week1";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

export default function RevisionPage() {
  const { progress, markRevisionDone } = useProgress();
  const now = Date.now();

  const due = progress.revisions
    .filter((r) => new Date(r.nextReviewAt).getTime() <= now)
    .sort(
      (a, b) =>
        new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
    );

  const upcoming = progress.revisions
    .filter((r) => new Date(r.nextReviewAt).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Revision
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Spaced Repetition</h1>
        <p className="mt-1 max-w-2xl text-zinc-400">
          Automatic intervals: 1 · 3 · 7 · 14 · 30 days after each chapter completion and each review.
        </p>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-amber-300" />
          <CardTitle className="text-base">Due now</CardTitle>
        </div>
        <CardDescription className="mt-1">
          {due.length === 0
            ? "Nothing due — complete chapters to schedule reviews."
            : `${due.length} item(s) waiting. Review actively, then mark done.`}
        </CardDescription>
      </Card>

      <div className="space-y-3">
        {due.map((r) => {
          const ch = getChapterById(r.chapterId);
          return (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-white">{r.chapterTitle}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <Badge tone="warning">Due</Badge>
                  <span>Interval {r.intervalDays}d</span>
                  <span>Reviews {r.reviewCount}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {ch && (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/textbook/${ch.slug}/`} prefetch={false}>
                      Open chapter
                    </Link>
                  </Button>
                )}
                <Button size="sm" onClick={() => markRevisionDone(r.id)}>
                  Mark reviewed
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Upcoming
        </h2>
        <div className="space-y-2">
          {upcoming.length === 0 && (
            <p className="text-sm text-zinc-600">No upcoming revisions scheduled yet.</p>
          )}
          {upcoming.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <span className="text-sm text-zinc-300">{r.chapterTitle}</span>
              <span className="text-xs text-zinc-500">
                Next: {new Date(r.nextReviewAt).toLocaleDateString()} · {r.intervalDays}d interval
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
