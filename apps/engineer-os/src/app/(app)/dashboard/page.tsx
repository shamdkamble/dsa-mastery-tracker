"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Target,
  BookOpen,
  Flame,
  Brain,
  CheckCircle2,
  Clock,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProgress } from "@/lib/progress-store";
import { USER_PROFILE } from "@/data/profile";
import { getDailyQuote } from "@/data/quotes";
import { getMissionForDay, WEEK1_CHAPTERS, WEEK1_TITLE } from "@/data/week1";
import { formatHours } from "@/lib/utils";

export default function DashboardPage() {
  const { progress } = useProgress();
  const mission = getMissionForDay(progress.currentDay) ?? getMissionForDay(1)!;
  const quote = getDailyQuote();
  const weekProgress = Math.round(
    (progress.chaptersCompleted.length / WEEK1_CHAPTERS.length) * 100
  );
  const checklistDone = mission.checklist.filter(
    (c) => progress.checklist[c.id]
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
            Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            Welcome back, {progress.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-zinc-400">
            {USER_PROFILE.currentMission} · Week {progress.currentWeek} · {WEEK1_TITLE}
          </p>
        </div>
        <Button asChild className="glow-accent">
          <Link href="/mission">
            Continue Mission <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-500/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Motivational Banner</CardTitle>
            <p className="mt-1 text-sm italic text-zinc-300">
              “{quote.text}” — {quote.author}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {USER_PROFILE.dreamCompanies.map((c) => (
              <Badge key={c} tone="accent">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Target className="h-4 w-4 text-indigo-300" />}
          label="Current Mission"
          value={`Day ${mission.day}: ${mission.title}`}
        />
        <Metric
          icon={<BookOpen className="h-4 w-4 text-cyan-300" />}
          label="Today's Goal"
          value={mission.objective.slice(0, 60) + "…"}
        />
        <Metric
          icon={<Clock className="h-4 w-4 text-emerald-300" />}
          label="Study Time"
          value={formatHours(progress.hoursStudiedMinutes)}
        />
        <Metric
          icon={<CheckCircle2 className="h-4 w-4 text-amber-300" />}
          label="Completed Tasks"
          value={`${checklistDone}/${mission.checklist.length} today`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Weekly Progress</CardTitle>
          <CardDescription className="mt-1">
            Week {progress.currentWeek} · {WEEK1_CHAPTERS.length} chapters
          </CardDescription>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-400">Chapters mastered</span>
              <span>
                {progress.chaptersCompleted.length}/{WEEK1_CHAPTERS.length}
              </span>
            </div>
            <Progress value={weekProgress} />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-400">Mission overall</span>
              <span>{progress.missionProgress}%</span>
            </div>
            <Progress value={progress.missionProgress} />
          </div>
        </Card>

        <Card>
          <CardTitle>Monthly Pulse</CardTitle>
          <CardDescription className="mt-1">August mission signal</CardDescription>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Pulse label="Streak" value={`${progress.streak} days`} icon={<Flame className="h-4 w-4 text-orange-400" />} />
            <Pulse
              label="Topics Mastered"
              value={`${progress.conceptsCompleted.length}`}
              icon={<Brain className="h-4 w-4 text-violet-300" />}
            />
            <Pulse
              label="Confidence"
              value={`${progress.confidence}%`}
              icon={<Trophy className="h-4 w-4 text-amber-300" />}
            />
            <Pulse
              label="Problems"
              value={`${progress.leetcodeSolved}`}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
            />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs text-zinc-500">Confidence score</div>
            <Progress value={progress.confidence} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" hover>
          <CardTitle>Today&apos;s Mission Snapshot</CardTitle>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{mission.objective}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
            <Badge>~{mission.estimatedMinutes}m total</Badge>
            <Badge tone="default">Read {mission.readingMinutes}m</Badge>
            <Badge tone="default">Practice {mission.practiceMinutes}m</Badge>
            <Badge tone="default">Quiz {mission.quizMinutes}m</Badge>
          </div>
          <ul className="mt-4 space-y-2">
            {mission.checklist.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-sm text-zinc-300"
              >
                <span
                  className={
                    progress.checklist[item.id]
                      ? "text-emerald-400"
                      : "text-zinc-600"
                  }
                >
                  {progress.checklist[item.id] ? "●" : "○"}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Daily Quote</CardTitle>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300 italic">
            “{quote.text}”
          </p>
          <p className="mt-2 text-xs text-zinc-500">— {quote.author}</p>
          <div className="mt-6 space-y-2">
            <Button asChild variant="secondary" className="w-full">
              <Link href="/textbook">Open Textbook</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/journal">Write Journal</Link>
            </Button>
          </div>
        </Card>
      </div>

      {progress.week1Complete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center"
        >
          <div className="text-lg font-semibold text-emerald-200">Week 1 Complete</div>
          <p className="mt-1 text-sm text-zinc-400">
            Foundations locked. Week 2 is conceptually unlocked — keep executing.
          </p>
        </motion.div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card hover className="p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white leading-snug line-clamp-2">
        {value}
      </div>
    </Card>
  );
}

function Pulse({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
