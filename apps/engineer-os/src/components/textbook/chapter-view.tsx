"use client";

import { useMemo } from "react";
import type { Chapter } from "@/lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Quiz } from "../quiz";
import { ProblemCard } from "../problem-card";
import { MermaidDiagram } from "../visuals/mermaid-diagram";
import { Flowchart } from "../visuals/flowchart";
import { ArrayAnimator } from "../visuals/array-animator";
import { VectorAnimator } from "../visuals/vector-animator";
import { ComplexityAnimator } from "../visuals/complexity-animator";
import { useProgress } from "@/lib/progress-store";
import { CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

function Section({
  id,
  title,
  children,
  delay = 0,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
      className="scroll-mt-24"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/40 to-transparent" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">
          {title}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/40 to-transparent" />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        {children}
      </div>
    </motion.section>
  );
}

function Prose({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-4 text-[15px] leading-7 text-zinc-300">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {p.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={j} className="font-semibold text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      ))}
    </div>
  );
}

export function ChapterView({ chapter }: { chapter: Chapter }) {
  const { progress, completeChapter } = useProgress();
  const done = progress.chaptersCompleted.includes(chapter.id);

  const toc = useMemo(
    () => [
      "Introduction",
      "Real World Problem",
      "Why This Exists",
      "History",
      "Visual Intuition",
      "Animation",
      "Simple Explanation",
      "Analogy",
      "Walkthrough",
      "Dry Run",
      "Code",
      "Diagrams",
      "Flowchart",
      "Memory",
      "Complexity",
      "Interview",
      "Mistakes",
      "Quiz",
      "Summary",
      "Revision",
      "Practice",
      "Reflection",
    ],
    []
  );

  return (
    <article className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 p-8 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Chapter {chapter.number}</Badge>
          <Badge>Day {chapter.day}</Badge>
          <Badge tone="default">
            <Clock className="mr-1 inline h-3 w-3" />
            {chapter.estimatedMinutes} min
          </Badge>
          {done && (
            <Badge tone="success">
              <CheckCircle2 className="mr-1 inline h-3 w-3" /> Completed
            </Badge>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {chapter.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-400">{chapter.subtitle}</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 text-xs text-zinc-500">
        {toc.map((t) => (
          <span
            key={t}
            className="shrink-0 rounded-full border border-white/5 bg-white/[0.02] px-2.5 py-1"
          >
            {t}
          </span>
        ))}
      </div>

      <Section id="intro" title="Chapter Introduction">
        <Prose text={chapter.introduction} />
      </Section>

      <Section id="real" title="Real World Problem">
        <Prose text={chapter.realWorldProblem} />
      </Section>

      <Section id="why" title="Why This Concept Exists">
        <Prose text={chapter.whyExists} />
      </Section>

      <Section id="history" title="Historical Background">
        <Prose text={chapter.historicalBackground} />
      </Section>

      <Section id="visual" title="Visual Intuition">
        <Prose text={chapter.visualIntuition} />
      </Section>

      <Section id="animation" title="Animation">
        {chapter.animationType === "arrays" && <ArrayAnimator />}
        {chapter.animationType === "vectors" && <VectorAnimator />}
        {chapter.animationType === "complexity" && <ComplexityAnimator />}
        {chapter.animationType === "binary-search" && <ComplexityAnimator />}
        {(chapter.animationType === "framework" ||
          chapter.animationType === "none" ||
          !chapter.animationType) && (
          <div className="space-y-4">
            <Flowchart steps={chapter.flowchartSteps} />
            <p className="text-sm text-zinc-500">
              Step through the process animation above. One idea at a time.
            </p>
          </div>
        )}
      </Section>

      <Section id="simple" title="Simple Explanation">
        <Prose text={chapter.simpleExplanation} />
      </Section>

      <Section id="analogy" title="Real Life Analogy">
        <Prose text={chapter.realLifeAnalogy} />
      </Section>

      <Section id="steps" title="Step-by-Step Walkthrough">
        <ol className="space-y-3">
          {chapter.stepByStep.map((s, i) => (
            <li key={i} className="flex gap-3 text-zinc-300">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="dryrun" title="Dry Run">
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-zinc-500">Input: </span>
            <span className="text-zinc-200">{chapter.dryRun.input}</span>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-zinc-300">
            {chapter.dryRun.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div>
            <span className="text-zinc-500">Output: </span>
            <span className="text-emerald-300/90">{chapter.dryRun.output}</span>
          </div>
        </div>
      </Section>

      <Section id="code" title="Code">
        <div className="space-y-4">
          {chapter.code.map((c, i) => (
            <div key={i}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">{c.title}</h3>
                <Badge>{c.language}</Badge>
              </div>
              <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 text-[13px] leading-6 text-zinc-200 prose-code">
                {c.content}
              </pre>
              <p className="mt-2 text-sm text-zinc-400">{c.explanation}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="diagrams" title="Visualization · Mermaid">
        <div className="space-y-4">
          {chapter.mermaidDiagrams.map((d, i) => (
            <MermaidDiagram key={i} title={d.title} code={d.code} />
          ))}
        </div>
      </Section>

      <Section id="flowchart" title="Flowchart">
        <Flowchart steps={chapter.flowchartSteps} />
      </Section>

      {chapter.memoryDiagram && (
        <Section id="memory" title="Memory Diagram">
          <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-xs leading-6 text-cyan-100/80 prose-code">
            {chapter.memoryDiagram}
          </pre>
        </Section>
      )}

      <Section id="complexity" title="Complexity Analysis">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Time", chapter.complexityAnalysis.time],
            ["Space", chapter.complexityAnalysis.space],
            ["Best", chapter.complexityAnalysis.best],
            ["Average", chapter.complexityAnalysis.average],
            ["Worst", chapter.complexityAnalysis.worst],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">{k}</div>
              <div className="mt-1 text-sm text-zinc-200">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
          {chapter.complexityAnalysis.explanation}
        </p>
      </Section>

      <Section id="interview" title="Interview Perspective">
        <Prose text={chapter.interviewPerspective} />
      </Section>

      <Section id="mistakes" title="Common Mistakes">
        <div className="space-y-3">
          {chapter.commonMistakes.map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-4"
            >
              <div className="text-sm font-medium text-rose-200/90">✗ {m.mistake}</div>
              <div className="mt-1 text-sm text-emerald-200/80">✓ {m.fix}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="quiz" title="Mini Quiz">
        <Quiz questions={chapter.miniQuiz} quizId={`quiz-${chapter.id}`} />
      </Section>

      <Section id="summary" title="Summary">
        <ul className="space-y-2">
          {chapter.summary.map((s, i) => (
            <li key={i} className="flex gap-2 text-zinc-300">
              <span className="text-indigo-400">▹</span>
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="revision" title="Revision Notes">
        <ul className="grid gap-2 sm:grid-cols-2">
          {chapter.revisionNotes.map((s, i) => (
            <li
              key={i}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
            >
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="practice" title="Practice Problems">
        <div className="space-y-3">
          {chapter.practiceProblems.map((p) => (
            <ProblemCard key={p.id} problem={p} />
          ))}
        </div>
      </Section>

      <Section id="reflection" title="Reflection Questions">
        <ul className="space-y-3">
          {chapter.reflectionQuestions.map((q, i) => (
            <li
              key={i}
              className="rounded-xl border border-white/10 bg-indigo-500/5 px-4 py-3 text-sm text-zinc-300"
            >
              {i + 1}. {q}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 p-6">
        <div>
          <div className="font-medium text-white">Chapter complete?</div>
          <div className="text-sm text-zinc-400">
            Mark complete to schedule spaced revision automatically.
          </div>
        </div>
        <Button
          onClick={() => completeChapter(chapter.id, chapter.title)}
          variant={done ? "secondary" : "default"}
        >
          {done ? "Completed ✓" : "Mark chapter complete"}
        </Button>
      </div>
    </article>
  );
}
