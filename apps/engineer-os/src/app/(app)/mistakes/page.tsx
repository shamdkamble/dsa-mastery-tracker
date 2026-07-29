"use client";

import { useState } from "react";
import { useProgress } from "@/lib/progress-store";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export default function MistakesPage() {
  const { progress, addMistake, updateMistake, deleteMistake } = useProgress();
  const [problemName, setProblemName] = useState("");
  const [mistake, setMistake] = useState("");
  const [correctThinking, setCorrectThinking] = useState("");
  const [lessonLearned, setLessonLearned] = useState("");
  const [revisionDate, setRevisionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!problemName.trim() || !mistake.trim()) return;
    addMistake({
      problemName,
      mistake,
      correctThinking,
      lessonLearned,
      revisionDate,
    });
    setProblemName("");
    setMistake("");
    setCorrectThinking("");
    setLessonLearned("");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Mistake Notebook
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Permanent Lessons</h1>
        <p className="mt-1 text-zinc-400">
          Problem · Mistake · Correct Thinking · Lesson · Revision Date
        </p>
      </div>

      <Card>
        <CardTitle>Log a mistake</CardTitle>
        <CardDescription className="mt-1">
          Specificity turns shame into skill
        </CardDescription>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input label="Problem name" value={problemName} onChange={setProblemName} required />
          <Input
            label="Revision date"
            type="date"
            value={revisionDate}
            onChange={setRevisionDate}
          />
          <Text
            className="sm:col-span-2"
            label="Mistake"
            value={mistake}
            onChange={setMistake}
            required
          />
          <Text
            className="sm:col-span-2"
            label="Correct thinking"
            value={correctThinking}
            onChange={setCorrectThinking}
          />
          <Text
            className="sm:col-span-2"
            label="Lesson learned"
            value={lessonLearned}
            onChange={setLessonLearned}
          />
          <div className="sm:col-span-2">
            <Button type="submit">Add to notebook</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {progress.mistakes.length === 0 && (
          <p className="text-sm text-zinc-600">No mistakes logged yet — you will. Log them same day.</p>
        )}
        {progress.mistakes.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium text-white">{m.problemName}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge>Revise {m.revisionDate}</Badge>
                  {m.revised ? (
                    <Badge tone="success">Revised</Badge>
                  ) : (
                    <Badge tone="warning">Pending</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!m.revised && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateMistake(m.id, { revised: true })}
                  >
                    Mark revised
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMistake(m.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-zinc-500" />
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-zinc-300">
              <p>
                <span className="text-rose-300/80">Mistake: </span>
                {m.mistake}
              </p>
              {m.correctThinking && (
                <p>
                  <span className="text-emerald-300/80">Correct: </span>
                  {m.correctThinking}
                </p>
              )}
              {m.lessonLearned && (
                <p>
                  <span className="text-indigo-300/80">Lesson: </span>
                  {m.lessonLearned}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none"
      />
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none"
      />
    </div>
  );
}
