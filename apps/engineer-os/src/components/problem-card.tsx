"use client";

import { useState } from "react";
import type { PracticeProblem } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useProgress } from "@/lib/progress-store";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

export function ProblemCard({
  problem,
  defaultOpen = false,
}: {
  problem: PracticeProblem;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showSolution, setShowSolution] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const { incrementProblems } = useProgress();
  const [solved, setSolved] = useState(false);

  const tone =
    problem.difficulty === "Easy"
      ? "success"
      : problem.difficulty === "Medium"
        ? "warning"
        : "danger";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.03]"
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-white">{problem.title}</span>
          <Badge tone={tone}>{problem.difficulty}</Badge>
          <Badge>{problem.language.toUpperCase()}</Badge>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      {open && (
        <div className="space-y-5 border-t border-white/10 px-5 py-5 text-sm leading-relaxed">
          <Section title="Problem Statement">{problem.statement}</Section>
          <Section title="Observation">{problem.observation}</Section>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Thinking Questions
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-zinc-300">
              {problem.thinkingQuestions.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Hints
              </h4>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setHintLevel((h) => Math.min(problem.hints.length, h + 1))
                }
                disabled={hintLevel >= problem.hints.length}
              >
                Reveal hint {hintLevel < problem.hints.length ? hintLevel + 1 : "✓"}
              </Button>
            </div>
            {hintLevel === 0 ? (
              <p className="text-zinc-500 italic">Hints hidden — think first.</p>
            ) : (
              <ul className="list-decimal space-y-1 pl-5 text-zinc-300">
                {problem.hints.slice(0, hintLevel).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
          </div>

          <Section title="Brute Force Thinking">{problem.bruteForce}</Section>
          <Section title="Optimization Thinking">{problem.optimization}</Section>
          <Section title="Dry Run">{problem.dryRun}</Section>
          <Section title="Complexity">{problem.complexity}</Section>
          <Section title="Reflection">{problem.reflection}</Section>

          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Solution
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSolution(!showSolution)}
              >
                {showSolution ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Reveal solution
                  </>
                )}
              </Button>
            </div>
            {showSolution ? (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-emerald-100/90 prose-code">
                {problem.solution}
              </pre>
            ) : (
              <p className="text-zinc-500 text-sm">
                Solution locked. Train thinking — reveal only after your attempt.
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant={solved ? "secondary" : "default"}
            onClick={() => {
              if (!solved) {
                incrementProblems(1);
                setSolved(true);
              }
            }}
          >
            {solved ? "Marked solved" : "Mark as solved"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h4>
      <p className="text-zinc-300 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
