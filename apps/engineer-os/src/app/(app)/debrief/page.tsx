"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useProgress } from "@/lib/progress-store";
import { WEEK1_CHAPTERS, WEEK1_TITLE } from "@/data/week1";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";
import { Trophy, ArrowRight } from "lucide-react";

export default function DebriefPage() {
  const { progress, completeWeek1 } = useProgress();
  const chapterPct = Math.round(
    (progress.chaptersCompleted.length / WEEK1_CHAPTERS.length) * 100
  );
  const quizScores = Object.values(progress.quizScores);
  const avgQuiz =
    quizScores.length === 0
      ? 0
      : Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (progress.chaptersCompleted.length >= 8) strengths.push("Strong textbook completion rate");
  else weaknesses.push("Finish remaining Week 1 chapters before advancing concepts");

  if (avgQuiz >= 70) strengths.push(`Solid quiz average (${avgQuiz}%)`);
  else if (quizScores.length) weaknesses.push(`Quiz average ${avgQuiz}% — re-quiz weak chapters`);
  else weaknesses.push("Take chapter quizzes to measure retention");

  if (progress.journal.length >= 3) strengths.push("Consistent reflection habit");
  else weaknesses.push("Write more journal entries — reflection converts activity into learning");

  if (progress.mistakes.length >= 1) strengths.push("Logging mistakes as assets");
  else weaknesses.push("Start the Mistake Notebook — failures must become lessons");

  if (progress.streak >= 3) strengths.push(`${progress.streak}-day streak discipline`);
  else weaknesses.push("Protect daily streak; consistency beats intensity");

  if (progress.leetcodeSolved >= 5) strengths.push("Practice volume building");
  else weaknesses.push("Mark more deliberate practice problems as solved (with ownership)");

  const canUnlock = progress.chaptersCompleted.length >= WEEK1_CHAPTERS.length || progress.week1Complete;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-500/30"
        >
          <Trophy className="h-8 w-8 text-white" />
        </motion.div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
          Mission Debrief
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Week 1 Progress Report</h1>
        <p className="mt-1 text-zinc-400">{WEEK1_TITLE}</p>
      </div>

      {progress.week1Complete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center"
        >
          <div className="text-lg font-semibold text-emerald-200">Week 1 Complete 🎉</div>
          <p className="mt-1 text-sm text-zinc-400">
            Foundations locked. Week 2 is unlocked in your mission state. Keep WIN AUGUST alive.
          </p>
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chapters" value={`${progress.chaptersCompleted.length}/${WEEK1_CHAPTERS.length}`} />
        <Stat label="Hours" value={formatHours(progress.hoursStudiedMinutes)} />
        <Stat label="Problems" value={`${progress.leetcodeSolved}`} />
        <Stat label="Avg Quiz" value={`${avgQuiz}%`} />
      </div>

      <Card>
        <CardTitle>Confidence chart</CardTitle>
        <CardDescription className="mt-1">Self-reported system confidence</CardDescription>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-zinc-400">Confidence</span>
            <span>{progress.confidence}%</span>
          </div>
          <Progress value={progress.confidence} />
        </div>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-zinc-400">Chapter mastery</span>
            <span>{chapterPct}%</span>
          </div>
          <Progress value={chapterPct} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="text-emerald-200">Strengths</CardTitle>
          <ul className="mt-3 space-y-2">
            {strengths.length === 0 && (
              <li className="text-sm text-zinc-500">Keep executing — strengths will appear.</li>
            )}
            {strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-emerald-400">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle className="text-amber-200">Weaknesses / Focus</CardTitle>
          <ul className="mt-3 space-y-2">
            {weaknesses.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-amber-400">→</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle>Revision suggestions</CardTitle>
        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
          <li>• Open Revision page and clear anything due (1/3/7/14/30 schedule).</li>
          <li>• Re-derive Two Sum and vector growth from memory.</li>
          <li>• Re-take quizzes scoring under 80%.</li>
          <li>• Cold-revisit Arrays & Vectors animations once more.</li>
          <li>• Read your Mistake Notebook before any mock interview.</li>
        </ul>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        {!progress.week1Complete && (
          <Button
            size="lg"
            className="glow-accent"
            disabled={!canUnlock}
            onClick={() => completeWeek1()}
          >
            {canUnlock ? "Mark Week 1 Complete · Unlock Week 2" : "Complete all chapters to unlock"}
          </Button>
        )}
        <Button asChild size="lg" variant="secondary">
          <Link href="/mission">
            Back to mission <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Badge tone="accent">Google</Badge>
        <Badge tone="accent">Microsoft</Badge>
        <Badge tone="accent">Amazon</Badge>
        <Badge tone="accent">Meta</Badge>
        <Badge>WIN AUGUST</Badge>
        <Badge tone="default">₹20+ LPA</Badge>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </Card>
  );
}
