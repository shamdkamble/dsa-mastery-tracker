"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";

const SIZES = [10, 100, 1000, 100000];

function linearSteps(n: number) {
  return n;
}
function binarySteps(n: number) {
  return Math.ceil(Math.log2(Math.max(n, 1)));
}

export function ComplexityAnimator() {
  const [n, setN] = useState(1000);
  const [mode, setMode] = useState<"linear" | "binary" | "both">("both");
  const [playKey, setPlayKey] = useState(0);

  const lin = linearSteps(n);
  const bin = binarySteps(n);

  // Cap visual for large n (log scale for UI)
  const linVisual = Math.min(100, (Math.log10(lin + 1) / Math.log10(100000 + 1)) * 100);
  const binVisual = Math.min(100, (bin / 20) * 100);

  const comparison = useMemo(
    () =>
      SIZES.map((size) => ({
        size,
        linear: linearSteps(size),
        binary: binarySteps(size),
      })),
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SIZES.map((size) => (
          <Button
            key={size}
            size="sm"
            variant={n === size ? "default" : "secondary"}
            onClick={() => {
              setN(size);
              setPlayKey((k) => k + 1);
            }}
          >
            n = {size.toLocaleString()}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["linear", "binary", "both"] as const).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "default" : "ghost"}
            onClick={() => setMode(m)}
          >
            {m} search
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2" key={playKey}>
        {(mode === "linear" || mode === "both") && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-medium text-white">Linear Search</div>
            <div className="mt-1 text-xs text-zinc-500">Worst-case comparisons ≈ n</div>
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${linVisual}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
              />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-rose-300">
              {lin.toLocaleString()}
              <span className="ml-2 text-sm font-normal text-zinc-500">steps</span>
            </p>
          </div>
        )}
        {(mode === "binary" || mode === "both") && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-medium text-white">Binary Search</div>
            <div className="mt-1 text-xs text-zinc-500">Sorted array · ≈ log₂(n)</div>
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${binVisual}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-emerald-300">
              {bin.toLocaleString()}
              <span className="ml-2 text-sm font-normal text-zinc-500">steps</span>
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">n</th>
              <th className="px-4 py-3 font-medium">Linear</th>
              <th className="px-4 py-3 font-medium">Binary</th>
              <th className="px-4 py-3 font-medium">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr
                key={row.size}
                className={
                  row.size === n
                    ? "bg-indigo-500/10 text-white"
                    : "text-zinc-300 border-t border-white/5"
                }
              >
                <td className="px-4 py-3 tabular-nums">{row.size.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-rose-300/90">
                  {row.linear.toLocaleString()}
                </td>
                <td className="px-4 py-3 tabular-nums text-emerald-300/90">
                  {row.binary}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-400">
                  {(row.linear / row.binary).toFixed(0)}×
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        Bars use log-scaled visuals for large n so linear search does not dominate the UI unrealistically —
        the table shows true step counts (linear worst-case ≈ n).
      </p>
    </div>
  );
}
