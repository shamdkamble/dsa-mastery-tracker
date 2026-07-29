"use client";

import { useMemo, useState } from "react";
import { ALL_PRACTICE_PROBLEMS, WEEK1_CHAPTERS } from "@/data/week1";
import { ProblemCard } from "@/components/problem-card";
import { Quiz } from "@/components/quiz";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuizQuestion } from "@/lib/types";

export default function PracticePage() {
  const [mode, setMode] = useState<"problems" | "quiz">("problems");
  const [difficulty, setDifficulty] = useState<"All" | "Easy" | "Medium" | "Hard">(
    "All"
  );

  const problems = useMemo(
    () =>
      ALL_PRACTICE_PROBLEMS.filter(
        (p) => difficulty === "All" || p.difficulty === difficulty
      ),
    [difficulty]
  );

  const allQuiz: QuizQuestion[] = useMemo(
    () => WEEK1_CHAPTERS.flatMap((c) => c.miniQuiz),
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Practice
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Deliberate Practice</h1>
        <p className="mt-1 text-zinc-400">
          Problems + mixed quizzes from Week 1. C++ focused.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={mode === "problems" ? "default" : "secondary"}
          onClick={() => setMode("problems")}
        >
          Problems
        </Button>
        <Button
          size="sm"
          variant={mode === "quiz" ? "default" : "secondary"}
          onClick={() => setMode("quiz")}
        >
          Mixed Quiz
        </Button>
      </div>

      {mode === "problems" && (
        <>
          <div className="flex flex-wrap gap-2">
            {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={difficulty === d ? "default" : "ghost"}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </Button>
            ))}
            <Badge className="ml-2 self-center">{problems.length} problems</Badge>
          </div>
          <div className="space-y-3">
            {problems.map((p) => (
              <ProblemCard key={p.id} problem={p} />
            ))}
          </div>
        </>
      )}

      {mode === "quiz" && (
        <Card className="p-6">
          <CardTitle className="mb-4">Week 1 Mixed Quiz</CardTitle>
          <Quiz questions={allQuiz} quizId="mixed-week1" />
        </Card>
      )}
    </div>
  );
}
