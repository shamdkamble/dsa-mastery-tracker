"use client";

import { useMemo } from "react";
import { useProgress } from "@/lib/progress-store";
import { WEEK1_CHAPTERS, WEEK1_MISSIONS } from "@/data/week1";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, BookOpen, Target, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AchievementsPage() {
  const { progress } = useProgress();

  const achievements = useMemo(() => {
    return [
      {
        id: "first-step",
        title: "Systems Online",
        desc: "Start your first mission",
        icon: Sparkles,
        unlocked: progress.started || progress.chaptersCompleted.length > 0,
      },
      {
        id: "first-chapter",
        title: "First Chapter",
        desc: "Complete any textbook chapter",
        icon: BookOpen,
        unlocked: progress.chaptersCompleted.length >= 1,
      },
      {
        id: "half-week",
        title: "Halfway Through Week 1",
        desc: "Complete 6 chapters",
        icon: Target,
        unlocked: progress.chaptersCompleted.length >= 6,
      },
      {
        id: "week1",
        title: "Foundation Locked",
        desc: "Complete all Week 1 chapters",
        icon: Trophy,
        unlocked:
          progress.week1Complete ||
          progress.chaptersCompleted.length >= WEEK1_CHAPTERS.length,
      },
      {
        id: "streak3",
        title: "3-Day Streak",
        desc: "Study three days in a row",
        icon: Flame,
        unlocked: progress.streak >= 3,
      },
      {
        id: "streak7",
        title: "Week Warrior",
        desc: "7-day streak",
        icon: Flame,
        unlocked: progress.streak >= 7,
      },
      {
        id: "problems10",
        title: "Problem Solver x10",
        desc: "Mark 10 problems solved",
        icon: Brain,
        unlocked: progress.leetcodeSolved >= 10,
      },
      {
        id: "journal3",
        title: "Reflective Engineer",
        desc: "Write 3 journal entries",
        icon: BookOpen,
        unlocked: progress.journal.length >= 3,
      },
      {
        id: "mistakes",
        title: "Mistake Alchemist",
        desc: "Log your first mistake",
        icon: Target,
        unlocked: progress.mistakes.length >= 1,
      },
      {
        id: "missions3",
        title: "Mission Steady",
        desc: "Complete 3 daily missions",
        icon: Trophy,
        unlocked: progress.dailyMissionsCompleted.length >= 3,
      },
      {
        id: "all-missions",
        title: "Week 1 Clear",
        desc: "Complete all 7 daily missions",
        icon: Trophy,
        unlocked: progress.dailyMissionsCompleted.length >= WEEK1_MISSIONS.length,
      },
      {
        id: "confidence70",
        title: "Quiet Confidence",
        desc: "Reach 70% confidence score",
        icon: Brain,
        unlocked: progress.confidence >= 70,
      },
    ];
  }, [progress]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Achievements
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Milestones</h1>
        <p className="mt-1 text-zinc-400">
          {unlockedCount}/{achievements.length} unlocked · fuel for WIN AUGUST
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => {
          const Icon = a.icon;
          return (
            <Card
              key={a.id}
              className={cn(
                "p-5",
                a.unlocked
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "opacity-50 grayscale"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    a.unlocked ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-zinc-500"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <CardDescription className="mt-1">{a.desc}</CardDescription>
                  <Badge className="mt-2" tone={a.unlocked ? "warning" : "default"}>
                    {a.unlocked ? "Unlocked" : "Locked"}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
