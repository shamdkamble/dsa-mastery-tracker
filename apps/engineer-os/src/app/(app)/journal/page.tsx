"use client";

import { useState } from "react";
import { useProgress } from "@/lib/progress-store";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function JournalPage() {
  const { progress, addJournal } = useProgress();
  const [learned, setLearned] = useState("");
  const [confused, setConfused] = useState("");
  const [pattern, setPattern] = useState("");
  const [confidence, setConfidence] = useState(50);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!learned.trim()) return;
    addJournal({
      date: new Date().toISOString().slice(0, 10),
      day: progress.currentDay,
      learned,
      confused,
      pattern,
      confidence,
    });
    setLearned("");
    setConfused("");
    setPattern("");
    setConfidence(50);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Journal
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Daily Reflection</h1>
        <p className="mt-1 text-zinc-400">
          What did I learn? What confused me? What pattern did I notice? How confident am I?
        </p>
      </div>

      <Card>
        <CardTitle>Today&apos;s entry</CardTitle>
        <CardDescription className="mt-1">
          Day {progress.currentDay} · Honest answers compound skill
        </CardDescription>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field
            label="What did I learn?"
            value={learned}
            onChange={setLearned}
            required
          />
          <Field
            label="What confused me?"
            value={confused}
            onChange={setConfused}
          />
          <Field
            label="What pattern did I notice?"
            value={pattern}
            onChange={setPattern}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Confidence: {confidence}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <Button type="submit">Save journal entry</Button>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          History
        </h2>
        {progress.journal.length === 0 && (
          <p className="text-sm text-zinc-600">No entries yet. Write after today&apos;s mission.</p>
        )}
        {progress.journal.map((j) => (
          <Card key={j.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{j.date}</Badge>
              <Badge tone="accent">Day {j.day}</Badge>
              <Badge tone="default">Confidence {j.confidence}%</Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">Learned: </span>
                {j.learned}
              </p>
              {j.confused && (
                <p>
                  <span className="text-zinc-500">Confused: </span>
                  {j.confused}
                </p>
              )}
              {j.pattern && (
                <p>
                  <span className="text-zinc-500">Pattern: </span>
                  {j.pattern}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none"
      />
    </div>
  );
}
