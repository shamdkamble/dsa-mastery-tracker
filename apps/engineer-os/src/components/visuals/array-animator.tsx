"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

type Mode = "traverse" | "insert" | "delete" | "shift";

export function ArrayAnimator({ initial = [10, 20, 30, 40, 50] }: { initial?: number[] }) {
  const [arr, setArr] = useState(initial);
  const [mode, setMode] = useState<Mode>("traverse");
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("Contiguous memory — pick an animation.");
  const [highlight, setHighlight] = useState<number[]>([]);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;

    async function run() {
      setCursor(-1);
      setHighlight([]);
      if (mode === "traverse") {
        setMessage("Traversing left → right (cache-friendly scan)");
        for (let i = 0; i < arr.length; i++) {
          if (cancelled) return;
          setCursor(i);
          setHighlight([i]);
          await sleep(450);
        }
        setMessage("Traversal complete — O(n) visits, O(1) access each");
      } else if (mode === "insert") {
        const value = 99;
        const idx = Math.min(2, arr.length);
        setMessage(`Insert ${value} at index ${idx} — shift tail right`);
        const next = [...arr];
        next.push(0);
        for (let i = next.length - 1; i > idx; i--) {
          if (cancelled) return;
          next[i] = next[i - 1];
          setArr([...next]);
          setHighlight([i, i - 1]);
          setCursor(i);
          setMessage(`Shift index ${i - 1} → ${i}`);
          await sleep(500);
        }
        next[idx] = value;
        setArr([...next]);
        setHighlight([idx]);
        setMessage(`Wrote ${value} at ${idx}. Insert mid is O(n).`);
      } else if (mode === "delete") {
        if (arr.length === 0) {
          setMessage("Array empty");
          setPlaying(false);
          return;
        }
        const idx = Math.min(1, arr.length - 1);
        setMessage(`Delete index ${idx} — shift tail left`);
        const next = [...arr];
        for (let i = idx; i < next.length - 1; i++) {
          if (cancelled) return;
          next[i] = next[i + 1];
          setArr([...next]);
          setHighlight([i, i + 1]);
          setCursor(i);
          setMessage(`Shift index ${i + 1} → ${i}`);
          await sleep(500);
        }
        next.pop();
        setArr([...next]);
        setHighlight([]);
        setMessage("Delete complete. Mid delete is O(n).");
      } else if (mode === "shift") {
        setMessage("Shifting all elements one slot right (make room at front)");
        const next = [...arr, 0];
        for (let i = next.length - 1; i > 0; i--) {
          if (cancelled) return;
          next[i] = next[i - 1];
          setArr(next.slice(0, -1).length === arr.length ? [...next.slice(0, arr.length)] : [...next]);
          // show growing conceptual shift on copy
          const display = [...arr];
          for (let k = display.length - 1; k >= Math.max(0, i - (next.length - arr.length)); k--) {
            /* simplified visual */
          }
          setArr((prev) => {
            const d = [...prev];
            if (i - 1 < d.length && i < d.length) {
              // progressive visual only
            }
            return prev;
          });
          setHighlight([Math.min(i, arr.length - 1)]);
          await sleep(350);
        }
        // clean demo: prepend undefined slot then shift values
        const base = [...initial];
        const shifted = [0, ...base.slice(0, -1)];
        for (let step = base.length - 1; step >= 0; step--) {
          if (cancelled) return;
          const snap = [...base];
          for (let j = base.length - 1; j > step; j--) snap[j] = base[j - 1];
          // build gradually
        }
        let cur = [...arr];
        for (let i = cur.length - 1; i > 0; i--) {
          if (cancelled) return;
          cur[i] = cur[i - 1];
          setArr([...cur]);
          setCursor(i);
          setHighlight([i, i - 1]);
          await sleep(400);
        }
        cur[0] = 0;
        setArr([...cur]);
        setMessage("Front insert requires shifting everyone — expensive.");
        void shifted;
      }
      setPlaying(false);
      setCursor(-1);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  function reset() {
    setPlaying(false);
    setArr([...initial]);
    setCursor(-1);
    setHighlight([]);
    setMessage("Reset to initial contiguous layout.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["traverse", "insert", "delete", "shift"] as Mode[]).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "default" : "secondary"}
            onClick={() => {
              setMode(m);
              setPlaying(false);
            }}
          >
            {m}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => setPlaying(true)} disabled={playing}>
          Play
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
          Memory · base + i × sizeof(int)
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <AnimatePresence mode="popLayout">
            {arr.map((v, i) => (
              <motion.div
                key={`${i}-${v}-${arr.length}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-xl border text-lg font-semibold transition-colors",
                    highlight.includes(i)
                      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-lg shadow-cyan-500/20"
                      : cursor === i
                        ? "border-indigo-400/60 bg-indigo-500/20 text-white"
                        : "border-white/10 bg-white/5 text-zinc-200"
                  )}
                >
                  {v}
                </div>
                <span className="text-[10px] text-zinc-500">[{i}]</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <p className="mt-4 text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
