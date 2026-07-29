"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Rocket, ArrowRight, Target, Flame, Code2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { USER_PROFILE } from "@/data/profile";
import { getDailyQuote } from "@/data/quotes";
import { useProgress } from "@/lib/progress-store";
import { formatHours } from "@/lib/utils";

export default function LandingPage() {
  const { progress, ready, startMission } = useProgress();
  const quote = getDailyQuote();

  return (
    <div className="min-h-screen bg-mesh">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-2xl shadow-indigo-500/40">
            <Rocket className="h-8 w-8 text-white" />
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300/80">
            Premium Interview OS
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            <span className="text-gradient">EngineerOS</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-400 sm:text-xl">
            Mission Control for Future Software Engineers
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Built for {USER_PROFILE.name} · C++ · {USER_PROFILE.currentMission}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="glow-accent">
              <Link
                href="/mission"
                onClick={() => {
                  if (ready) startMission();
                }}
              >
                Start
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </div>

          <p className="mt-8 max-w-md text-sm italic text-zinc-500">
            “{quote.text}” — {quote.author}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8"
        >
          <Card className="border-white/10 p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Mission Status</h2>
                <p className="text-sm text-zinc-500">Single source of truth · local progress</p>
              </div>
              <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-semibold text-indigo-200">
                {USER_PROFILE.currentMission}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Current Goal" value={USER_PROFILE.currentGoal} />
              <Stat label="Target Salary" value={USER_PROFILE.targetSalary} />
              <Stat label="Current Week" value={`Week ${progress.currentWeek}`} />
              <Stat label="Current Day" value={`Day ${progress.currentDay}`} />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-zinc-400">Mission Progress</span>
                <span className="font-medium text-white">{progress.missionProgress}%</span>
              </div>
              <Progress value={progress.missionProgress} className="h-2.5" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                icon={<Flame className="h-4 w-4 text-orange-400" />}
                label="Consistency"
                value={`${progress.consistencyDays} Days`}
              />
              <MiniStat
                icon={<Code2 className="h-4 w-4 text-emerald-400" />}
                label="LeetCode"
                value={`${progress.leetcodeSolved} Solved`}
              />
              <MiniStat
                icon={<Clock className="h-4 w-4 text-cyan-400" />}
                label="Hours Studied"
                value={formatHours(progress.hoursStudiedMinutes)}
              />
              <MiniStat
                icon={<Target className="h-4 w-4 text-indigo-400" />}
                label="Streak"
                value={`${progress.streak} 🔥`}
              />
            </div>

            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto glow-accent">
                <Link
                  href="/mission"
                  onClick={() => {
                    if (ready) startMission();
                  }}
                >
                  START TODAY&apos;S MISSION
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {USER_PROFILE.dreamCompanies.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                >
                  {c}
                </span>
              ))}
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                {USER_PROFILE.dreamPackage}
              </span>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-left">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white leading-snug">{value}</div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
