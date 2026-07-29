export type ChapterSectionKey =
  | "introduction"
  | "realWorldProblem"
  | "whyExists"
  | "historicalBackground"
  | "visualIntuition"
  | "animation"
  | "simpleExplanation"
  | "realLifeAnalogy"
  | "stepByStep"
  | "dryRun"
  | "code"
  | "visualization"
  | "flowchart"
  | "memoryDiagram"
  | "complexityAnalysis"
  | "interviewPerspective"
  | "commonMistakes"
  | "miniQuiz"
  | "summary"
  | "revisionNotes"
  | "practiceProblems"
  | "reflectionQuestions";

export interface QuizQuestion {
  id: string;
  type: "mcq" | "fill" | "predict" | "complexity" | "dryrun" | "truefalse";
  question: string;
  options?: string[];
  answer: string | number | boolean;
  explanation: string;
  code?: string;
}

export interface PracticeProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  statement: string;
  observation: string;
  thinkingQuestions: string[];
  hints: string[];
  bruteForce: string;
  optimization: string;
  dryRun: string;
  complexity: string;
  reflection: string;
  solution: string;
  language: "cpp";
}

export interface Chapter {
  id: string;
  slug: string;
  number: number;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  day: number;
  introduction: string;
  realWorldProblem: string;
  whyExists: string;
  historicalBackground: string;
  visualIntuition: string;
  animationType?: "arrays" | "vectors" | "complexity" | "binary-search" | "framework" | "none";
  simpleExplanation: string;
  realLifeAnalogy: string;
  stepByStep: string[];
  dryRun: {
    input: string;
    steps: string[];
    output: string;
  };
  code: {
    language: string;
    title: string;
    content: string;
    explanation: string;
  }[];
  mermaidDiagrams: {
    title: string;
    code: string;
  }[];
  flowchartSteps: {
    id: string;
    label: string;
    type: "start" | "process" | "decision" | "end";
  }[];
  memoryDiagram?: string;
  complexityAnalysis: {
    time: string;
    space: string;
    best: string;
    average: string;
    worst: string;
    explanation: string;
  };
  interviewPerspective: string;
  commonMistakes: { mistake: string; fix: string }[];
  miniQuiz: QuizQuestion[];
  summary: string[];
  revisionNotes: string[];
  practiceProblems: PracticeProblem[];
  reflectionQuestions: string[];
}

export interface DailyMission {
  day: number;
  week: number;
  title: string;
  objective: string;
  chapterIds: string[];
  estimatedMinutes: number;
  readingMinutes: number;
  animationMinutes: number;
  practiceMinutes: number;
  quizMinutes: number;
  reflectionMinutes: number;
  checklist: {
    id: string;
    label: string;
    type: "read" | "animation" | "practice" | "quiz" | "reflection" | "revision";
  }[];
}

export interface JournalEntry {
  id: string;
  date: string;
  day: number;
  learned: string;
  confused: string;
  pattern: string;
  confidence: number;
  createdAt: string;
}

export interface MistakeEntry {
  id: string;
  problemName: string;
  mistake: string;
  correctThinking: string;
  lessonLearned: string;
  revisionDate: string;
  createdAt: string;
  revised: boolean;
}

export interface RevisionItem {
  id: string;
  chapterId: string;
  chapterTitle: string;
  completedAt: string;
  nextReviewAt: string;
  intervalDays: number;
  reviewCount: number;
}

export interface ProgressState {
  started: boolean;
  currentWeek: number;
  currentDay: number;
  streak: number;
  lastStudyDate: string | null;
  hoursStudiedMinutes: number;
  leetcodeSolved: number;
  conceptsCompleted: string[];
  chaptersCompleted: string[];
  quizScores: Record<string, number>;
  confidence: number;
  missionProgress: number;
  consistencyDays: number;
  checklist: Record<string, boolean>;
  dailyMissionsCompleted: number[];
  journal: JournalEntry[];
  mistakes: MistakeEntry[];
  revisions: RevisionItem[];
  studySessions: { date: string; minutes: number }[];
  week1Complete: boolean;
  name: string;
  settings: {
    dailyGoalMinutes: number;
    soundEnabled: boolean;
  };
}

export const DEFAULT_PROGRESS: ProgressState = {
  started: false,
  currentWeek: 1,
  currentDay: 1,
  streak: 0,
  lastStudyDate: null,
  hoursStudiedMinutes: 0,
  leetcodeSolved: 0,
  conceptsCompleted: [],
  chaptersCompleted: [],
  quizScores: {},
  confidence: 0,
  missionProgress: 0,
  consistencyDays: 0,
  checklist: {},
  dailyMissionsCompleted: [],
  journal: [],
  mistakes: [],
  revisions: [],
  studySessions: [],
  week1Complete: false,
  name: "Sham Kamble",
  settings: {
    dailyGoalMinutes: 120,
    soundEnabled: true,
  },
};
