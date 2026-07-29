"use client";

import { useProgress } from "@/lib/progress-store";
import {
  getMissionForDay,
  getChapterById,
  WEEK1_MISSIONS,
  WEEK1_CHAPTERS,
} from "@/data/week1";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChapterLink } from "@/components/chapter-link";
import {
  BookOpen,
  Sparkles,
  Dumbbell,
  HelpCircle,
  NotebookPen,
  Check,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function MissionPage() {
  const { progress, toggleChecklist, completeDailyMission, startMission, completeWeek1 } =
    useProgress();
  const router = useRouter();
  const day = progress.currentDay;
  const mission = getMissionForDay(day) ?? WEEK1_MISSIONS[0];
  const chapters = mission.chapterIds
    .map((id) => getChapterById(id))
    .filter(Boolean);

  const doneCount = mission.checklist.filter((c) => progress.checklist[c.id]).length;
  const allDone = doneCount === mission.checklist.length;
  const pct = Math.round((doneCount / mission.checklist.length) * 100);

  function finishDay() {
    completeDailyMission(mission.day);
    if (mission.day === 7) {
      const allChapters =
        progress.chaptersCompleted.length >= WEEK1_CHAPTERS.length ||
        progress.dailyMissionsCompleted.includes(7);
      if (allChapters || allDone) completeWeek1();
      router.push("/debrief");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300/80">
          Daily Mission
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Mission {mission.day}
        </h1>
        <p className="mt-1 text-xl text-zinc-300">{mission.title}</p>
      </div>

      <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">Week {mission.week}</Badge>
          <Badge>Day {mission.day}</Badge>
          <Badge tone="default">~{mission.estimatedMinutes} min</Badge>
        </div>
        <CardTitle className="mt-4 text-xl">Today&apos;s Objective</CardTitle>
        <CardDescription className="mt-2 text-base text-zinc-300 leading-relaxed">
          {mission.objective}
        </CardDescription>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <TimeCell icon={<BookOpen className="h-3.5 w-3.5" />} label="Reading" mins={mission.readingMinutes} />
          <TimeCell icon={<Sparkles className="h-3.5 w-3.5" />} label="Animation" mins={mission.animationMinutes} />
          <TimeCell icon={<Dumbbell className="h-3.5 w-3.5" />} label="Practice" mins={mission.practiceMinutes} />
          <TimeCell icon={<HelpCircle className="h-3.5 w-3.5" />} label="Quiz" mins={mission.quizMinutes} />
          <TimeCell icon={<NotebookPen className="h-3.5 w-3.5" />} label="Reflection" mins={mission.reflectionMinutes} />
          <TimeCell icon={<Check className="h-3.5 w-3.5" />} label="Total" mins={mission.estimatedMinutes} />
        </div>
      </Card>

      <Card>
        <CardTitle>Today&apos;s Chapters</CardTitle>
        <div className="mt-4 space-y-2">
          {chapters.map((ch) =>
            ch ? (
              <ChapterLink
                key={ch.id}
                slug={ch.slug}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-indigo-500/30 hover:bg-indigo-500/5"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    Ch {ch.number}. {ch.title}
                  </div>
                  <div className="text-xs text-zinc-500">{ch.estimatedMinutes} min read</div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500" />
              </ChapterLink>
            ) : null
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Mission Checklist</CardTitle>
          <span className="text-sm text-zinc-400">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-3" />
        <ul className="mt-4 space-y-2">
          {mission.checklist.map((item) => {
            const checked = !!progress.checklist[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    startMission();
                    toggleChecklist(item.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm transition hover:bg-white/5"
                >
                  <span
                    className={
                      checked
                        ? "flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-black"
                        : "flex h-5 w-5 items-center justify-center rounded-md border border-white/20"
                    }
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className={checked ? "text-zinc-400 line-through" : "text-zinc-200"}>
                    {item.label}
                  </span>
                  <Badge className="ml-auto" tone="default">
                    {item.type}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="flex-1 glow-accent"
          size="lg"
          type="button"
          onClick={() =>
            router.push(
              chapters[0] ? `/textbook/${chapters[0]!.slug}` : "/textbook"
            )
          }
        >
          Begin Learning
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant={allDone ? "default" : "secondary"}
          className="flex-1"
          onClick={finishDay}
          disabled={progress.dailyMissionsCompleted.includes(mission.day)}
        >
          {progress.dailyMissionsCompleted.includes(mission.day)
            ? "Day Complete ✓"
            : "Complete Today's Mission"}
        </Button>
      </div>

      <p className="text-center text-xs text-zinc-600">
        No menus inside the mission flow — just today&apos;s work. Sidebar available if needed.
      </p>
    </div>
  );
}

function TimeCell({
  icon,
  label,
  mins,
}: {
  icon: React.ReactNode;
  label: string;
  mins: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-white">{mins} min</div>
    </div>
  );
}
