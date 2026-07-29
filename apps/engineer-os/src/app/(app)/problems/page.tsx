"use client";

import { ALL_PRACTICE_PROBLEMS } from "@/data/week1";
import { ProblemCard } from "@/components/problem-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function ProblemsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Problem Solving
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Train Thinking</h1>
        <p className="mt-1 max-w-2xl text-zinc-400">
          Solutions stay hidden until you click. Use observation, hints, brute force, then optimize —
          never jump to optimal immediately.
        </p>
      </div>

      <Card>
        <CardTitle className="text-base">Protocol</CardTitle>
        <CardDescription className="mt-2 leading-relaxed">
          Problem Statement → Observation → Thinking Questions → Hints → Brute Force → Optimization
          → Dry Run → Complexity → Reflection → Reveal Solution last.
        </CardDescription>
      </Card>

      <div className="space-y-3">
        {ALL_PRACTICE_PROBLEMS.map((p) => (
          <div key={p.id}>
            <p className="mb-1 text-xs text-zinc-600">
              From: {p.chapterTitle}
            </p>
            <ProblemCard problem={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
