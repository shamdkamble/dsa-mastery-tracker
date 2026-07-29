"use client";

import { WEEK1_MISSIONS, WEEK1_TITLE, getChapterById } from "@/data/week1";
import { useProgress } from "@/lib/progress-store";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChapterLink } from "@/components/chapter-link";
import { CheckCircle2, Circle, Lock } from "lucide-react";

export default function RoadmapPage() {
  const { progress } = useProgress();
  const completedDays = new Set(progress.dailyMissionsCompleted);
  const weekPct = Math.round(
    (completedDays.size / WEEK1_MISSIONS.length) * 100
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Weekly Roadmap
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Week 1</h1>
        <p className="mt-1 text-zinc-400">{WEEK1_TITLE}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Fixed roadmap. No redesigns. Execute day by day.
        </p>
      </div>

      <Card>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Week completion</span>
          <span className="text-white">{weekPct}%</span>
        </div>
        <Progress value={weekPct} className="mt-2" />
      </Card>

      <div className="space-y-4">
        {WEEK1_MISSIONS.map((m) => {
          const done = completedDays.has(m.day);
          const current = progress.currentDay === m.day && !done;
          const locked = m.day > progress.currentDay && !done;

          return (
            <Card
              key={m.day}
              className={
                current
                  ? "border-indigo-500/40 bg-indigo-500/5"
                  : done
                    ? "border-emerald-500/20"
                    : ""
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                  ) : locked ? (
                    <Lock className="mt-0.5 h-5 w-5 text-zinc-600" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 text-indigo-300" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>
                        Day {m.day}: {m.title}
                      </CardTitle>
                      {current && <Badge tone="accent">Today</Badge>}
                      {done && <Badge tone="success">Done</Badge>}
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-zinc-400 leading-relaxed">
                      {m.objective}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.chapterIds.map((id) => {
                        const ch = getChapterById(id);
                        if (!ch) return null;
                        return (
                          <ChapterLink key={id} slug={ch.slug}>
                            <Badge
                              tone={
                                progress.chaptersCompleted.includes(id)
                                  ? "success"
                                  : "default"
                              }
                              className="hover:border-indigo-400/40"
                            >
                              {ch.title}
                            </Badge>
                          </ChapterLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">~{m.estimatedMinutes}m</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/10 bg-white/[0.02]">
        <CardTitle className="text-base">Week 2</CardTitle>
        <p className="mt-2 text-sm text-zinc-500">
          Locked until Week 1 debrief. No roadmap suggestions beyond the fixed plan.
        </p>
      </Card>
    </div>
  );
}
