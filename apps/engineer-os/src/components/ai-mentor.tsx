"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { WEEK1_CHAPTERS } from "@/data/week1";

type Msg = { role: "user" | "assistant"; text: string };

const WEEK1_KEYWORDS = [
  "array",
  "vector",
  "big o",
  "big-o",
  "complexity",
  "time complexity",
  "google interview",
  "dsa",
  "leetcode",
  "mindset",
  "growth",
  "ai",
  "framework",
  "problem solving",
  "binary search",
  "push_back",
  "capacity",
  "size",
  "week 1",
  "mission",
  "introduction",
  "o(n)",
  "o(1)",
  "contiguous",
  "amortized",
  "two sum",
  "interview",
  "sham",
  "win august",
  "cpp",
  "c++",
  "dry run",
  "quiz",
  "revision",
  "streak",
  "foundation",
  "how google",
  "why dsa",
  "memory",
  "flowchart",
  "linear search",
  "insert",
  "delete",
  "shift",
  "reserve",
  "resize",
  "erase",
];

const BEYOND = [
  "dynamic programming",
  "dp ",
  "graph",
  "bfs",
  "dfs",
  "tree",
  "trie",
  "segment tree",
  "system design",
  "week 2",
  "week 3",
  "linked list",
  "heap",
  "priority queue",
  "backtracking",
  "recursion advanced",
  "bit manipulation",
  "union find",
  "kafka",
  "kubernetes",
  "react",
  "database index",
  "sql join",
  "os scheduler",
  "mutex",
  "deadlock",
];

function mentorReply(input: string): string {
  const q = input.toLowerCase().trim();

  if (!q) return "Ask me anything about Week 1 — arrays, vectors, Big-O, interviews, or your framework.";

  if (BEYOND.some((k) => q.includes(k))) {
    return "That topic is beyond Week 1. Stay locked on your current mission — foundations, complexity, arrays/vectors, and the problem-solving framework. Complete Week 1 first; advanced topics unlock after your debrief. WIN AUGUST is built one solid day at a time.";
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
    return "Hey Sham. I'm your Week 1 mentor. I only coach Introduction through LeetCode Guide — nothing beyond. What are you studying today?";
  }

  if (q.includes("what should") || q.includes("what do i") || q.includes("today")) {
    return "Open Today's Mission. Do not browse randomly. Complete the checklist for your current day, then journal. Decision fatigue ends when you follow the mission.";
  }

  if (q.includes("array")) {
    return "Arrays are contiguous memory: index i lives at base + i*size → O(1) access. Unsorted search is O(n). Mid insert/delete costs O(n) due to shifting. Draw the boxes, animate a shift once, then solve Remove Element with two pointers.";
  }

  if (q.includes("vector") || q.includes("push_back") || q.includes("capacity")) {
    return "std::vector is a dynamic array. size = live elements, capacity = allocated slots. push_back is amortized O(1) because capacity grows geometrically (often doubles). reserve(n) when you know size. Remember: reallocation invalidates references/pointers/iterators.";
  }

  if (q.includes("big o") || q.includes("big-o") || q.includes("complexity") || q.includes("o(n)")) {
    return "Time complexity = growth of work as n grows. Drop constants and lower terms. Know O(1), O(log n), O(n), O(n log n), O(n²) cold. For n ≤ 1e5, O(n²) is usually too slow. Always state time and space after coding.";
  }

  if (q.includes("binary search") || q.includes("linear search")) {
    return "Linear search: up to n checks. Binary search (sorted only): ~log₂(n) checks — about 20 for a million elements. Use mid = lo + (hi-lo)/2 to avoid overflow. Master bounds carefully; off-by-one is the classic bug.";
  }

  if (q.includes("interview") || q.includes("google")) {
    return "Google coding rounds score structured thinking + communication + correct-enough code. Process: Clarify → Examples → Brute → Optimize → Code → Test → Complexity. Never silent-code from second zero. Narrate trade-offs.";
  }

  if (q.includes("framework") || q.includes("problem solving")) {
    return "EngineerOS 7 steps: 1 Clarify 2 Examples 3 Brute Force 4 Optimize 5 Code 6 Test 7 Reflect/Complexity. Write them as comments until automatic. Easy problems are perfect framework reps.";
  }

  if (q.includes("leetcode")) {
    return "LeetCode protocol: topic-aligned problems, timer on, AI off during attempt, editorial only after real effort, then re-implement cold, tag patterns, schedule 1/3/7/14/30 revision. Raw solve count without ownership is vanity.";
  }

  if (q.includes("mindset") || q.includes("fail") || q.includes("stuck")) {
    return "Struggle is training data, not identity. Extract one lesson → Mistake Notebook → schedule revision → drill the sub-skill → retry later. Replace “I can’t” with “I can’t yet.”";
  }

  if (q.includes("ai")) {
    return "AI is leverage in delivery and a crutch if used too early in training. Attempt first. Hints second. Full solutions last — then rewrite from memory. Interview rounds still need your brain.";
  }

  if (q.includes("dsa") || q.includes("why")) {
    return "DSA still matters: interviews use it as a fair signal, and production scale exposes quadratic time you didn't feel at n=100. AI doesn't remove ownership of correctness and complexity.";
  }

  if (WEEK1_KEYWORDS.some((k) => q.includes(k))) {
    const topics = WEEK1_CHAPTERS.map((c) => c.title).join(", ");
    return `Good Week 1 question. Study it in the Interactive Textbook with full sections (intuition → dry run → code → quiz). Week 1 topics: ${topics}. Open the matching chapter and complete one idea at a time.`;
  }

  return "I only mentor Week 1 content. Rephrase around arrays, vectors, Big-O, interviews, mindset, framework, or LeetCode protocol — or open Today's Mission and ask about that chapter. Stay on mission.";
}

export function AIMentor() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Week 1 mentor online. I know only foundations through LeetCode Guide. Ask about today's concept — I'll refuse anything beyond Week 1.",
    },
  ]);

  const chapters = useMemo(() => WEEK1_CHAPTERS.map((c) => c.title), []);

  function send() {
    const text = input.trim();
    if (!text) return;
    const reply = mentorReply(text);
    setMsgs((m) => [...m, { role: "user", text }, { role: "assistant", text: reply }]);
    setInput("");
  }

  return (
    <>
      <motion.button
        type="button"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-xl shadow-indigo-500/40"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        aria-label="Open AI Mentor"
      >
        <Bot className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-24 right-6 z-50 flex h-[min(560px,70vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl glass-strong shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-300" />
                <div>
                  <div className="text-sm font-semibold text-white">AI Mentor</div>
                  <div className="text-[10px] text-zinc-500">Week 1 only · {chapters.length} chapters</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-2xl rounded-br-md bg-indigo-500/20 border border-indigo-500/20 px-3 py-2 text-sm text-zinc-100"
                      : "mr-6 rounded-2xl rounded-bl-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-300 leading-relaxed"
                  }
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask about Week 1..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none"
                />
                <Button size="icon" onClick={send} aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
