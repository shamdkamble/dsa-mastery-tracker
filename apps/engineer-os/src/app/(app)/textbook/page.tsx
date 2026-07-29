"use client";

import { WEEK1_CHAPTERS, WEEK1_TITLE } from "@/data/week1";
import { useProgress } from "@/lib/progress-store";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChapterLink } from "@/components/chapter-link";
import { BookOpen, CheckCircle2, ArrowRight } from "lucide-react";

export default function TextbookIndexPage() {
  const { progress } = useProgress();
  const done = progress.chaptersCompleted.length;
  const pct = Math.round((done / WEEK1_CHAPTERS.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Interactive Textbook
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Week 1 Textbook</h1>
        <p className="mt-1 text-zinc-400">{WEEK1_TITLE}</p>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 leading-relaxed">
          Premium engineering book — not notes, not slides. Every chapter follows the full structure:
          intuition, animation, dry run, code, diagrams, quiz, practice, reflection.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Reading progress</span>
          <span>
            {done}/{WEEK1_CHAPTERS.length} chapters · {pct}%
          </span>
        </div>
        <Progress value={pct} className="mt-2" />
      </Card>

      <div className="grid gap-3">
        {WEEK1_CHAPTERS.map((ch) => {
          const completed = progress.chaptersCompleted.includes(ch.id);
          return (
            <ChapterLink key={ch.id} slug={ch.slug} className="block">
              <Card hover className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    {completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <BookOpen className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {ch.number}. {ch.title}
                      </CardTitle>
                      <Badge>Day {ch.day}</Badge>
                      {completed && <Badge tone="success">Done</Badge>}
                    </div>
                    <CardDescription className="mt-1">{ch.subtitle}</CardDescription>
                    <div className="mt-2 text-xs text-zinc-600">
                      ~{ch.estimatedMinutes} min · {ch.miniQuiz.length} quiz ·{" "}
                      {ch.practiceProblems.length} practice
                    </div>
                  </div>
                </div>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-zinc-500 sm:block" />
              </Card>
            </ChapterLink>
          );
        })}
      </div>
    </div>
  );
}
