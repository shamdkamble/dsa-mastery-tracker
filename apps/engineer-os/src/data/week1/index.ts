import type { Chapter, DailyMission } from "@/lib/types";
import { chaptersPart1 } from "./chapters-part1";
import { chaptersPart2 } from "./chapters-part2";
import { chaptersPart3 } from "./chapters-part3";

export const WEEK1_TITLE = "Building the Foundation of Problem Solving";
export const WEEK1_NUMBER = 1;

export const WEEK1_CHAPTERS: Chapter[] = [
  ...chaptersPart1,
  ...chaptersPart2,
  ...chaptersPart3,
].sort((a, b) => a.number - b.number);

export function getChapterBySlug(slug: string): Chapter | undefined {
  return WEEK1_CHAPTERS.find((c) => c.slug === slug);
}

export function getChapterById(id: string): Chapter | undefined {
  return WEEK1_CHAPTERS.find((c) => c.id === id);
}

export function getChaptersForDay(day: number): Chapter[] {
  return WEEK1_CHAPTERS.filter((c) => c.day === day);
}

export const WEEK1_MISSIONS: DailyMission[] = [
  {
    day: 1,
    week: 1,
    title: "Launch Sequence",
    objective:
      "Internalize EngineerOS as your only study system and understand how Google interviews actually work.",
    chapterIds: ["w1-c01", "w1-c02"],
    estimatedMinutes: 60,
    readingMinutes: 30,
    animationMinutes: 5,
    practiceMinutes: 15,
    quizMinutes: 5,
    reflectionMinutes: 5,
    checklist: [
      { id: "d1-read", label: "Read Introduction + Google Interviews chapters", type: "read" },
      { id: "d1-anim", label: "Watch framework flow animation", type: "animation" },
      { id: "d1-practice", label: "Complete Personal Mission Contract + Interview Script Drill", type: "practice" },
      { id: "d1-quiz", label: "Finish Day 1 mini quizzes", type: "quiz" },
      { id: "d1-reflect", label: "Write journal: learn / confuse / pattern / confidence", type: "reflection" },
    ],
  },
  {
    day: 2,
    week: 1,
    title: "Mindset & Modern Reality",
    objective:
      "Build durable motivation: why DSA matters, how AI changes prep, and growth mindset under failure.",
    chapterIds: ["w1-c03", "w1-c04", "w1-c05"],
    estimatedMinutes: 75,
    readingMinutes: 40,
    animationMinutes: 5,
    practiceMinutes: 15,
    quizMinutes: 8,
    reflectionMinutes: 7,
    checklist: [
      { id: "d2-read", label: "Read DSA, AI, Growth Mindset chapters", type: "read" },
      { id: "d2-anim", label: "Run complexity intuition visual", type: "animation" },
      { id: "d2-practice", label: "Mistake Alchemy + AI-Free Timer Drill", type: "practice" },
      { id: "d2-quiz", label: "Complete Day 2 quizzes", type: "quiz" },
      { id: "d2-reflect", label: "Journal with honest confidence score", type: "reflection" },
    ],
  },
  {
    day: 3,
    week: 1,
    title: "Complexity Fluency",
    objective:
      "Gain fluency in time complexity and Big-O so you can estimate algorithms before coding.",
    chapterIds: ["w1-c06", "w1-c07"],
    estimatedMinutes: 80,
    readingMinutes: 35,
    animationMinutes: 15,
    practiceMinutes: 20,
    quizMinutes: 5,
    reflectionMinutes: 5,
    checklist: [
      { id: "d3-read", label: "Read Time Complexity + Big O chapters", type: "read" },
      { id: "d3-anim", label: "Animate linear vs binary search growth", type: "animation" },
      { id: "d3-practice", label: "Estimate Before Coding + Classify Five Snippets", type: "practice" },
      { id: "d3-quiz", label: "Complexity quizzes passed", type: "quiz" },
      { id: "d3-reflect", label: "Reflect on complexity confidence", type: "reflection" },
    ],
  },
  {
    day: 4,
    week: 1,
    title: "Arrays Mastery",
    objective:
      "See arrays as contiguous memory. Master access, traversal, shifting, and classic index patterns.",
    chapterIds: ["w1-c08"],
    estimatedMinutes: 70,
    readingMinutes: 25,
    animationMinutes: 15,
    practiceMinutes: 20,
    quizMinutes: 5,
    reflectionMinutes: 5,
    checklist: [
      { id: "d4-read", label: "Read Arrays textbook chapter fully", type: "read" },
      { id: "d4-anim", label: "Animate traversal, insert, delete, shift", type: "animation" },
      { id: "d4-practice", label: "Remove Element + Max Consecutive Ones", type: "practice" },
      { id: "d4-quiz", label: "Arrays mini quiz", type: "quiz" },
      { id: "d4-reflect", label: "Journal array insights", type: "reflection" },
    ],
  },
  {
    day: 5,
    week: 1,
    title: "Vectors in C++",
    objective:
      "Master std::vector: size vs capacity, growth, push_back amortization, erase, reserve, resize.",
    chapterIds: ["w1-c09"],
    estimatedMinutes: 75,
    readingMinutes: 25,
    animationMinutes: 15,
    practiceMinutes: 25,
    quizMinutes: 5,
    reflectionMinutes: 5,
    checklist: [
      { id: "d5-read", label: "Read Vectors chapter", type: "read" },
      { id: "d5-anim", label: "Animate capacity doubling and push_back", type: "animation" },
      { id: "d5-practice", label: "Capacity trace + squares/erase drill", type: "practice" },
      { id: "d5-quiz", label: "Vectors quiz", type: "quiz" },
      { id: "d5-reflect", label: "Explain amortized O(1) in journal", type: "reflection" },
    ],
  },
  {
    day: 6,
    week: 1,
    title: "The Framework",
    objective:
      "Install the 7-step problem solving framework and apply it to classic Easy problems.",
    chapterIds: ["w1-c10"],
    estimatedMinutes: 80,
    readingMinutes: 25,
    animationMinutes: 5,
    practiceMinutes: 35,
    quizMinutes: 5,
    reflectionMinutes: 10,
    checklist: [
      { id: "d6-read", label: "Read Problem Solving Framework", type: "read" },
      { id: "d6-anim", label: "Walk the framework flowchart", type: "animation" },
      { id: "d6-practice", label: "Two Sum + Contains Duplicate with full framework", type: "practice" },
      { id: "d6-quiz", label: "Framework quiz", type: "quiz" },
      { id: "d6-reflect", label: "Note which step you rush", type: "reflection" },
    ],
  },
  {
    day: 7,
    week: 1,
    title: "LeetCode Protocol & Week Debrief",
    objective:
      "Lock the LeetCode training protocol, complete the three-pack, and finish Week 1 debrief.",
    chapterIds: ["w1-c11"],
    estimatedMinutes: 90,
    readingMinutes: 25,
    animationMinutes: 5,
    practiceMinutes: 40,
    quizMinutes: 5,
    reflectionMinutes: 15,
    checklist: [
      { id: "d7-read", label: "Read LeetCode Guide", type: "read" },
      { id: "d7-anim", label: "Review weekly progress visuals", type: "animation" },
      { id: "d7-practice", label: "Protocol Three-Pack completed", type: "practice" },
      { id: "d7-quiz", label: "LeetCode guide quiz", type: "quiz" },
      { id: "d7-reflect", label: "Week 1 debrief journal", type: "reflection" },
      { id: "d7-revision", label: "Schedule revisions for all Week 1 chapters", type: "revision" },
    ],
  },
];

export function getMissionForDay(day: number): DailyMission | undefined {
  return WEEK1_MISSIONS.find((m) => m.day === day);
}

export const ALL_PRACTICE_PROBLEMS = WEEK1_CHAPTERS.flatMap((c) =>
  c.practiceProblems.map((p) => ({ ...p, chapterId: c.id, chapterTitle: c.title }))
);
