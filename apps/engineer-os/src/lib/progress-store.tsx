"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_PROGRESS,
  type JournalEntry,
  type MistakeEntry,
  type ProgressState,
  type RevisionItem,
} from "./types";

const STORAGE_KEY = "engineeros-progress-v1";

function loadProgress(): ProgressState {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveProgress(state: ProgressState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.round((d2 - d1) / 86400000);
}

interface ProgressContextValue {
  progress: ProgressState;
  ready: boolean;
  startMission: () => void;
  toggleChecklist: (id: string) => void;
  completeChapter: (chapterId: string, title: string) => void;
  completeDailyMission: (day: number) => void;
  recordQuizScore: (quizId: string, score: number) => void;
  addStudyMinutes: (minutes: number) => void;
  incrementProblems: (n?: number) => void;
  setConfidence: (value: number) => void;
  addJournal: (entry: Omit<JournalEntry, "id" | "createdAt">) => void;
  updateJournal: (id: string, patch: Partial<JournalEntry>) => void;
  addMistake: (entry: Omit<MistakeEntry, "id" | "createdAt" | "revised">) => void;
  updateMistake: (id: string, patch: Partial<MistakeEntry>) => void;
  deleteMistake: (id: string) => void;
  markRevisionDone: (id: string) => void;
  completeWeek1: () => void;
  updateSettings: (settings: Partial<ProgressState["settings"]>) => void;
  resetProgress: () => void;
  recalculateMissionProgress: (totalChapters: number) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const REVISION_INTERVALS = [1, 3, 7, 14, 30];

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(DEFAULT_PROGRESS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadProgress();
    // Update streak on load
    const today = todayISO();
    if (loaded.lastStudyDate) {
      const gap = daysBetween(loaded.lastStudyDate, today);
      if (gap > 1) {
        loaded.streak = 0;
      }
    }
    setProgress(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveProgress(progress);
  }, [progress, ready]);

  const update = useCallback((fn: (p: ProgressState) => ProgressState) => {
    setProgress((prev) => fn(prev));
  }, []);

  const startMission = useCallback(() => {
    update((p) => ({
      ...p,
      started: true,
      lastStudyDate: todayISO(),
      streak: p.streak || 1,
      consistencyDays: Math.max(p.consistencyDays, 1),
    }));
  }, [update]);

  const touchStudyDay = (p: ProgressState): ProgressState => {
    const today = todayISO();
    if (p.lastStudyDate === today) return p;
    let streak = 1;
    if (p.lastStudyDate && daysBetween(p.lastStudyDate, today) === 1) {
      streak = p.streak + 1;
    }
    return {
      ...p,
      lastStudyDate: today,
      streak,
      consistencyDays: p.consistencyDays + (p.lastStudyDate === today ? 0 : 1),
    };
  };

  const toggleChecklist = useCallback(
    (id: string) => {
      update((p) => {
        const next = { ...p.checklist, [id]: !p.checklist[id] };
        return touchStudyDay({ ...p, checklist: next });
      });
    },
    [update]
  );

  const completeChapter = useCallback(
    (chapterId: string, title: string) => {
      update((p) => {
        if (p.chaptersCompleted.includes(chapterId)) return p;
        const chaptersCompleted = [...p.chaptersCompleted, chapterId];
        const conceptsCompleted = [...new Set([...p.conceptsCompleted, title])];
        const completedAt = new Date().toISOString();
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + 1);
        const revision: RevisionItem = {
          id: `rev-${chapterId}-${Date.now()}`,
          chapterId,
          chapterTitle: title,
          completedAt,
          nextReviewAt: nextReview.toISOString(),
          intervalDays: 1,
          reviewCount: 0,
        };
        const missionProgress = Math.min(
          100,
          Math.round((chaptersCompleted.length / 11) * 100)
        );
        return touchStudyDay({
          ...p,
          chaptersCompleted,
          conceptsCompleted,
          revisions: [...p.revisions, revision],
          missionProgress,
          confidence: Math.min(100, p.confidence + 5),
        });
      });
    },
    [update]
  );

  const completeDailyMission = useCallback(
    (day: number) => {
      update((p) => {
        if (p.dailyMissionsCompleted.includes(day)) return p;
        const dailyMissionsCompleted = [...p.dailyMissionsCompleted, day].sort(
          (a, b) => a - b
        );
        const currentDay = Math.min(7, Math.max(p.currentDay, day + 1));
        return touchStudyDay({
          ...p,
          dailyMissionsCompleted,
          currentDay,
          hoursStudiedMinutes: p.hoursStudiedMinutes + 90,
        });
      });
    },
    [update]
  );

  const recordQuizScore = useCallback(
    (quizId: string, score: number) => {
      update((p) =>
        touchStudyDay({
          ...p,
          quizScores: { ...p.quizScores, [quizId]: score },
          confidence: Math.min(
            100,
            Math.round(p.confidence * 0.9 + score * 0.1)
          ),
        })
      );
    },
    [update]
  );

  const addStudyMinutes = useCallback(
    (minutes: number) => {
      update((p) => {
        const today = todayISO();
        const sessions = [...p.studySessions];
        const idx = sessions.findIndex((s) => s.date === today);
        if (idx >= 0) {
          sessions[idx] = {
            ...sessions[idx],
            minutes: sessions[idx].minutes + minutes,
          };
        } else {
          sessions.push({ date: today, minutes });
        }
        return touchStudyDay({
          ...p,
          hoursStudiedMinutes: p.hoursStudiedMinutes + minutes,
          studySessions: sessions,
        });
      });
    },
    [update]
  );

  const incrementProblems = useCallback(
    (n = 1) => {
      update((p) =>
        touchStudyDay({ ...p, leetcodeSolved: p.leetcodeSolved + n })
      );
    },
    [update]
  );

  const setConfidence = useCallback(
    (value: number) => {
      update((p) => ({ ...p, confidence: Math.max(0, Math.min(100, value)) }));
    },
    [update]
  );

  const addJournal = useCallback(
    (entry: Omit<JournalEntry, "id" | "createdAt">) => {
      update((p) => ({
        ...p,
        journal: [
          {
            ...entry,
            id: `j-${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
          ...p.journal,
        ],
      }));
    },
    [update]
  );

  const updateJournal = useCallback(
    (id: string, patch: Partial<JournalEntry>) => {
      update((p) => ({
        ...p,
        journal: p.journal.map((j) => (j.id === id ? { ...j, ...patch } : j)),
      }));
    },
    [update]
  );

  const addMistake = useCallback(
    (entry: Omit<MistakeEntry, "id" | "createdAt" | "revised">) => {
      update((p) => ({
        ...p,
        mistakes: [
          {
            ...entry,
            id: `m-${Date.now()}`,
            createdAt: new Date().toISOString(),
            revised: false,
          },
          ...p.mistakes,
        ],
      }));
    },
    [update]
  );

  const updateMistake = useCallback(
    (id: string, patch: Partial<MistakeEntry>) => {
      update((p) => ({
        ...p,
        mistakes: p.mistakes.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
    },
    [update]
  );

  const deleteMistake = useCallback(
    (id: string) => {
      update((p) => ({
        ...p,
        mistakes: p.mistakes.filter((m) => m.id !== id),
      }));
    },
    [update]
  );

  const markRevisionDone = useCallback(
    (id: string) => {
      update((p) => ({
        ...p,
        revisions: p.revisions.map((r) => {
          if (r.id !== id) return r;
          const nextCount = r.reviewCount + 1;
          const interval =
            REVISION_INTERVALS[
              Math.min(nextCount, REVISION_INTERVALS.length - 1)
            ];
          const next = new Date();
          next.setDate(next.getDate() + interval);
          return {
            ...r,
            reviewCount: nextCount,
            intervalDays: interval,
            nextReviewAt: next.toISOString(),
          };
        }),
      }));
    },
    [update]
  );

  const completeWeek1 = useCallback(() => {
    update((p) => ({
      ...p,
      week1Complete: true,
      currentWeek: 2,
      missionProgress: 100,
      confidence: Math.max(p.confidence, 70),
    }));
  }, [update]);

  const updateSettings = useCallback(
    (settings: Partial<ProgressState["settings"]>) => {
      update((p) => ({
        ...p,
        settings: { ...p.settings, ...settings },
      }));
    },
    [update]
  );

  const resetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const recalculateMissionProgress = useCallback(
    (totalChapters: number) => {
      update((p) => ({
        ...p,
        missionProgress: Math.min(
          100,
          Math.round((p.chaptersCompleted.length / totalChapters) * 100)
        ),
      }));
    },
    [update]
  );

  const value = useMemo(
    () => ({
      progress,
      ready,
      startMission,
      toggleChecklist,
      completeChapter,
      completeDailyMission,
      recordQuizScore,
      addStudyMinutes,
      incrementProblems,
      setConfidence,
      addJournal,
      updateJournal,
      addMistake,
      updateMistake,
      deleteMistake,
      markRevisionDone,
      completeWeek1,
      updateSettings,
      resetProgress,
      recalculateMissionProgress,
    }),
    [
      progress,
      ready,
      startMission,
      toggleChecklist,
      completeChapter,
      completeDailyMission,
      recordQuizScore,
      addStudyMinutes,
      incrementProblems,
      setConfidence,
      addJournal,
      updateJournal,
      addMistake,
      updateMistake,
      deleteMistake,
      markRevisionDone,
      completeWeek1,
      updateSettings,
      resetProgress,
      recalculateMissionProgress,
    ]
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
