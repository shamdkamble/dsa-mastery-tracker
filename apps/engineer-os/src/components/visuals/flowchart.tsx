"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export function Flowchart({
  steps,
}: {
  steps: { id: string; label: string; type: "start" | "process" | "decision" | "end" }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setActive((a) => Math.max(0, a - 1))}>
          Prev
        </Button>
        <Button
          size="sm"
          onClick={() => setActive((a) => Math.min(steps.length - 1, a + 1))}
        >
          Next step
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setActive(0)}>
          Reset
        </Button>
      </div>
      <div className="flex flex-col items-center gap-0 py-4">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-col items-center">
            <motion.div
              animate={{
                scale: i === active ? 1.05 : 1,
                opacity: i <= active ? 1 : 0.4,
              }}
              className={cn(
                "min-w-[180px] max-w-xs px-4 py-3 text-center text-sm font-medium border transition-colors",
                step.type === "start" || step.type === "end"
                  ? "rounded-full"
                  : step.type === "decision"
                    ? "rounded-lg rotate-0"
                    : "rounded-xl",
                i === active
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-50 shadow-lg shadow-cyan-500/10"
                  : i < active
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-100"
                    : "border-white/10 bg-white/5 text-zinc-400"
              )}
            >
              {step.label}
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                className={cn(
                  "h-8 w-0.5 my-1",
                  i < active ? "bg-indigo-400/60" : "bg-white/15"
                )}
                animate={{ scaleY: i < active ? 1 : 0.8 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
