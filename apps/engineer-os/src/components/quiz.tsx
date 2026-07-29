"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/types";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress-store";
import { CheckCircle2, XCircle } from "lucide-react";

export function Quiz({
  questions,
  quizId,
}: {
  questions: QuizQuestion[];
  quizId: string;
}) {
  const { recordQuizScore } = useProgress();
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [fillInputs, setFillInputs] = useState<Record<string, string>>({});

  function select(q: QuizQuestion, value: string | number | boolean) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [q.id]: value }));
  }

  function submit() {
    setSubmitted(true);
    let correct = 0;
    for (const q of questions) {
      const ans = answers[q.id];
      if (q.type === "fill") {
        if (
          String(fillInputs[q.id] ?? "")
            .trim()
            .toLowerCase() === String(q.answer).toLowerCase()
        )
          correct++;
      } else if (ans === q.answer) correct++;
    }
    const score = Math.round((correct / questions.length) * 100);
    recordQuizScore(quizId, score);
  }

  function isCorrect(q: QuizQuestion) {
    if (q.type === "fill") {
      return (
        String(fillInputs[q.id] ?? "")
          .trim()
          .toLowerCase() === String(q.answer).toLowerCase()
      );
    }
    return answers[q.id] === q.answer;
  }

  const score = submitted
    ? Math.round(
        (questions.filter(isCorrect).length / questions.length) * 100
      )
    : null;

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div
          key={q.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-white leading-relaxed">
              <span className="mr-2 text-zinc-500">Q{qi + 1}.</span>
              {q.question}
            </p>
            {submitted &&
              (isCorrect(q) ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
              ))}
          </div>

          {q.code && (
            <pre className="mb-3 overflow-x-auto rounded-xl bg-black/40 p-3 text-xs text-zinc-300 prose-code">
              {q.code}
            </pre>
          )}

          {q.type === "fill" ? (
            <input
              disabled={submitted}
              value={fillInputs[q.id] ?? ""}
              onChange={(e) =>
                setFillInputs((f) => ({ ...f, [q.id]: e.target.value }))
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="Type your answer"
            />
          ) : q.type === "truefalse" ? (
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => select(q, v)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm transition-colors",
                    answers[q.id] === v
                      ? "border-indigo-400/50 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                  )}
                >
                  {v ? "True" : "False"}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(q.options ?? []).map((opt, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => select(q, oi)}
                  className={cn(
                    "flex w-full items-start rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    answers[q.id] === oi
                      ? "border-indigo-400/50 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
                    submitted &&
                      oi === q.answer &&
                      "border-emerald-500/40 bg-emerald-500/10",
                    submitted &&
                      answers[q.id] === oi &&
                      oi !== q.answer &&
                      "border-rose-500/40 bg-rose-500/10"
                  )}
                >
                  <span className="mr-3 text-zinc-500">{String.fromCharCode(65 + oi)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {submitted && (
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              <span className="text-zinc-300 font-medium">Explanation: </span>
              {q.explanation}
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-4">
        {!submitted ? (
          <Button onClick={submit}>Submit quiz</Button>
        ) : (
          <div className="text-sm">
            Score:{" "}
            <span className="text-lg font-semibold text-indigo-300">{score}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
