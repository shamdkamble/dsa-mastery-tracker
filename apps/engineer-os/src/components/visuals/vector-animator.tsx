"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export function VectorAnimator() {
  const [size, setSize] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [data, setData] = useState<(number | null)[]>([]);
  const [log, setLog] = useState("Empty vector — size=0 capacity=0");
  const [lastGrew, setLastGrew] = useState(false);

  function pushBack() {
    const value = size * 10 + 10;
    let nextData = data;
    let nextCap = capacity;
    let grew = false;
    if (size >= capacity) {
      nextCap = capacity === 0 ? 1 : capacity * 2;
      nextData = Array.from({ length: nextCap }, (_, i) => (i < size ? data[i] : null));
      grew = true;
    } else {
      nextData = [...data];
    }
    nextData[size] = value;
    setData(nextData);
    setCapacity(nextCap);
    setSize(size + 1);
    setLastGrew(grew);
    setLog(
      grew
        ? `push_back(${value}) caused GROW → capacity ${capacity} → ${nextCap} (copy ${size} elements), size=${size + 1}`
        : `push_back(${value}) into free slot — O(1) this call. size=${size + 1} capacity=${nextCap}`
    );
  }

  function reserve(n: number) {
    if (n <= capacity) {
      setLog(`reserve(${n}): capacity already ${capacity}`);
      return;
    }
    const next = Array.from({ length: n }, (_, i) => (i < size ? data[i] : null));
    setData(next);
    setCapacity(n);
    setLastGrew(true);
    setLog(`reserve(${n}): capacity raised without changing size (${size})`);
  }

  function popBack() {
    if (size === 0) {
      setLog("pop_back on empty — no-op / undefined in real C++ if empty");
      return;
    }
    const next = [...data];
    next[size - 1] = null;
    setData(next);
    setSize(size - 1);
    setLastGrew(false);
    setLog(`pop_back(): size ${size} → ${size - 1}, capacity stays ${capacity}`);
  }

  function eraseAt(idx: number) {
    if (idx < 0 || idx >= size) return;
    const next = [...data];
    for (let i = idx; i < size - 1; i++) next[i] = next[i + 1];
    next[size - 1] = null;
    setData(next);
    setSize(size - 1);
    setLastGrew(false);
    setLog(`erase(begin+${idx}): shifted tail left — O(n). size=${size - 1}`);
  }

  function reset() {
    setSize(0);
    setCapacity(0);
    setData([]);
    setLastGrew(false);
    setLog("Reset to empty vector");
  }

  const slots = capacity === 0 ? [] : data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={pushBack}>
          push_back
        </Button>
        <Button size="sm" variant="secondary" onClick={popBack}>
          pop_back
        </Button>
        <Button size="sm" variant="secondary" onClick={() => reserve(8)}>
          reserve(8)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => eraseAt(0)} disabled={size === 0}>
          erase(begin)
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1">
          size = <strong className="text-indigo-300">{size}</strong>
        </span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1">
          capacity = <strong className="text-cyan-300">{capacity}</strong>
        </span>
        {lastGrew && (
          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-amber-200">
            reallocation
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 min-h-[120px]">
        {slots.length === 0 ? (
          <p className="text-zinc-500 text-sm">No buffer allocated yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((v, i) => (
              <motion.div
                key={i}
                layout
                className={cn(
                  "flex h-14 w-14 flex-col items-center justify-center rounded-xl border text-sm",
                  i < size
                    ? "border-indigo-400/40 bg-indigo-500/15 text-white"
                    : "border-dashed border-white/10 bg-white/[0.02] text-zinc-600"
                )}
              >
                <span className="font-semibold">{v === null ? "·" : v}</span>
                <span className="text-[9px] text-zinc-500">{i < size ? "live" : "free"}</span>
              </motion.div>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-zinc-400">{log}</p>
      </div>
    </div>
  );
}
