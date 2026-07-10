/**
 * Pilot learning facts for Phase 1 topics (manual seed — no AI yet)
 */

import { buildTopicDeepLink } from "../roadmap-catalog.js";

/** @type {Array<{ id: string, topicId: string, phase: number, topicName: string, hookStyle: string, title: string, body: string }>} */
export const PILOT_LEARNING_FACTS = [
  {
    id: "fact_seed_cpp-toolchain_1",
    topicId: "cpp-toolchain",
    phase: 1,
    topicName: "Toolchain & First Program",
    hookStyle: "curiosity",
    title: "Your first C++ program hides a full pipeline",
    body: "Compile, link, and run — FAANG interviews still ask what happens between source code and the binary.",
  },
  {
    id: "fact_seed_cpp-toolchain_2",
    topicId: "cpp-toolchain",
    phase: 1,
    topicName: "Toolchain & First Program",
    hookStyle: "interview",
    title: "g++ vs clang: interviewers notice tooling fluency",
    body: "Knowing how to compile with warnings enabled (-Wall) signals you write production-grade C++, not just puzzle code.",
  },
  {
    id: "fact_seed_dsa-complexity_1",
    topicId: "dsa-complexity",
    phase: 1,
    topicName: "Time & Space Complexity",
    hookStyle: "curiosity",
    title: "O(1) can still feel slow",
    body: "Hash maps are O(1) on average — but collisions and cache misses are why interviewers ask for trade-off analysis.",
  },
  {
    id: "fact_seed_dsa-complexity_2",
    topicId: "dsa-complexity",
    phase: 1,
    topicName: "Time & Space Complexity",
    hookStyle: "interview",
    title: "Big-O is about growth, not milliseconds",
    body: "Interviewers want you to compare algorithms as input scales — that's why complexity is Phase 1 topic #2.",
  },
  {
    id: "fact_seed_dsa-arrays_1",
    topicId: "dsa-arrays",
    phase: 1,
    topicName: "Arrays — Fundamentals",
    hookStyle: "analogy",
    title: "Arrays are RAM in a straight line",
    body: "Contiguous memory is why index access is O(1) — and why inserting in the middle shifts everything.",
  },
  {
    id: "fact_seed_dsa-two-pointers-intro_1",
    topicId: "dsa-two-pointers-intro",
    phase: 1,
    topicName: "Two Pointers — Introduction",
    hookStyle: "curiosity",
    title: "Two pointers can beat a hash map",
    body: "On sorted arrays, two pointers often drop O(n) space to O(1) — a pattern that appears in 100+ LeetCode mediums.",
  },
  {
    id: "fact_seed_dsa-hashing-intro_1",
    topicId: "dsa-hashing-intro",
    phase: 1,
    topicName: "Hashing — Core Idea",
    hookStyle: "history",
    title: "Hash maps power your favorite apps",
    body: "Databases, caches, and deduplication all rely on the same idea you'll practice in this topic: map keys to values fast.",
  },
];

export function toFactDocument(seed) {
  return {
    ...seed,
    deepLink: buildTopicDeepLink(seed.topicId),
    source: "seed",
    active: true,
  };
}