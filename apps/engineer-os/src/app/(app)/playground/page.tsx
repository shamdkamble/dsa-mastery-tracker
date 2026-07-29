"use client";

import { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrayAnimator } from "@/components/visuals/array-animator";
import { VectorAnimator } from "@/components/visuals/vector-animator";
import { ComplexityAnimator } from "@/components/visuals/complexity-animator";
import { Flowchart } from "@/components/visuals/flowchart";
import { MermaidDiagram } from "@/components/visuals/mermaid-diagram";

const TABS = [
  { id: "arrays", label: "Arrays" },
  { id: "vectors", label: "Vectors" },
  { id: "complexity", label: "Time Complexity" },
  { id: "binary", label: "Binary vs Linear" },
  { id: "framework", label: "Framework Flow" },
  { id: "memory", label: "Memory Layout" },
] as const;

export default function PlaygroundPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("arrays");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Visual Playground
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">See it. Then code it.</h1>
        <p className="mt-1 max-w-2xl text-zinc-400">
          Interactive animations for Week 1 concepts. Everything possible should be animated.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card className="p-6">
        {tab === "arrays" && (
          <>
            <CardTitle>Array Animations</CardTitle>
            <CardDescription className="mt-1 mb-4">
              Contiguous memory · traversal · insertion · deletion · shifting
            </CardDescription>
            <ArrayAnimator />
          </>
        )}
        {tab === "vectors" && (
          <>
            <CardTitle>Vector Animations</CardTitle>
            <CardDescription className="mt-1 mb-4">
              Capacity · doubling · push_back · reserve · erase
            </CardDescription>
            <VectorAnimator />
          </>
        )}
        {(tab === "complexity" || tab === "binary") && (
          <>
            <CardTitle>Complexity Comparison</CardTitle>
            <CardDescription className="mt-1 mb-4">
              n = 10 · 100 · 1000 · 100000 — linear search vs binary search
            </CardDescription>
            <ComplexityAnimator />
          </>
        )}
        {tab === "framework" && (
          <>
            <CardTitle>Problem Solving Process</CardTitle>
            <CardDescription className="mt-1 mb-4">
              Step highlighting with animated progression
            </CardDescription>
            <Flowchart
              steps={[
                { id: "1", label: "Clarify", type: "start" },
                { id: "2", label: "Examples + Edges", type: "process" },
                { id: "3", label: "Brute Force", type: "process" },
                { id: "4", label: "Optimize?", type: "decision" },
                { id: "5", label: "Code + Test", type: "process" },
                { id: "6", label: "Reflect", type: "end" },
              ]}
            />
            <div className="mt-6">
              <MermaidDiagram
                title="Full process diagram"
                code={`flowchart TD
  A[Clarify] --> B[Examples]
  B --> C[Brute Force]
  C --> D{Fits constraints?}
  D -->|Yes| E[Code]
  D -->|No| F[Optimize]
  F --> E
  E --> G[Test]
  G --> H[Complexity + Pattern]`}
              />
            </div>
          </>
        )}
        {tab === "memory" && (
          <>
            <CardTitle>Memory Layout Diagrams</CardTitle>
            <CardDescription className="mt-1 mb-4">
              Arrays and vectors in contiguous RAM
            </CardDescription>
            <div className="space-y-4">
              <MermaidDiagram
                title="Array contiguous layout"
                code={`flowchart LR
  B[Base] --> A0[a0]
  A0 --> A1[a1]
  A1 --> A2[a2]
  A2 --> A3[a3]
  A3 --> A4[a4]`}
              />
              <MermaidDiagram
                title="Vector growth"
                code={`flowchart TD
  A[push_back] --> B{size less capacity?}
  B -->|Yes| C[Write O1]
  B -->|No| D[Allocate 2x]
  D --> E[Move elements]
  E --> C`}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
