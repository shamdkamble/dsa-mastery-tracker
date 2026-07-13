/**
 * Derived stats & aggregations from live data
 */

import {
  getDB,
  getProblems,
  getActivities,
  getTodaysMissionProblems,
  updateLongestStreak,
} from "./db.js";
import { PATTERN_CATALOG } from "./patterns-catalog.js";
import { resolveProblemPattern } from "./pattern-resolver.js";
import { normalizeTopicKey, resolveProblemTopic } from "./topic-resolver.js";
import { isRevisionDue, isRevisionEligible, getRevisionRoundLabel } from "./revision-schedule.js";
import {
  todayKey,
  yesterdayKey,
  formatRelativeTime,
  formatMinutes,
  formatDateLabel,
  daysInMonth,
} from "./helpers.js";
import { computeLearningMissionItem } from "./learning-missions.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeProblemDifficulty(difficulty) {
  const d = String(difficulty || "").trim().toLowerCase();
  if (d === "easy") return "Easy";
  if (d === "medium") return "Medium";
  if (d === "hard") return "Hard";
  return null;
}

export function isProblemMarkedDone(problem) {
  return problem?.status === "mastered"
    || Boolean(problem?.missionDone)
    || Boolean(problem?.solvedAt);
}

function getActiveDays() {
  const days = new Set(getActivities().map((a) => a.timestamp.slice(0, 10)));
  return days;
}

export function computeStreak() {
  const days = getActiveDays();
  let streak = 0;
  const d = new Date();

  for (let i = 0; i < 365; i++) {
    const key = todayKey(d);
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (i === 0) {
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  updateLongestStreak(streak);
  const longest = getDB().meta.longestStreak;
  return { current: streak, longest: Math.max(longest, streak) };
}

export function computeStats() {
  const problems = getProblems();
  const activities = getActivities();
  const today = todayKey();
  const streak = computeStreak();

  const markedDone = problems.filter(isProblemMarkedDone);
  const revisionsDue = problems.filter((p) => isRevisionEligible(p) && isRevisionDue(p, today));
  const missionItems = computeTodaysMission();
  const todaysRevisions = missionItems.filter((m) => m.type === "revision").length;
  const missionDoneToday = missionItems.filter((m) => m.done).length;

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weeklySolved = activities.filter(
    (a) => a.action === "Solved" && a.timestamp >= weekAgo
  ).length;

  const solvedActs = activities.filter((a) => a.action === "Solved").length;
  const failedActs = activities.filter((a) => a.action === "Failed attempt").length;
  const accuracy = solvedActs + failedActs > 0
    ? Math.round((solvedActs / (solvedActs + failedActs)) * 100)
    : 0;

  const todayActs = activities.filter((a) => a.timestamp.slice(0, 10) === today);
  const todaySolved = problems.filter(
    (p) => p.solvedAt && p.solvedAt.slice(0, 10) === today && p.actualSolveMinutes,
  );
  const studyMinutesToday = todaySolved.reduce((sum, p) => sum + (p.actualSolveMinutes || 0), 0)
    || todayActs.length * 20;

  const solvedWithTime = problems.filter((p) => p.solvedAt && (p.actualSolveMinutes || p.estimatedMinutes));
  const avgMinutes = solvedWithTime.length
    ? Math.round(solvedWithTime.reduce(
      (s, p) => s + (p.actualSolveMinutes || p.estimatedMinutes || 0),
      0,
    ) / solvedWithTime.length)
    : 0;

  return {
    todaysRevisions,
    revisionsDue: revisionsDue.length,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    problemsSolved: markedDone.length,
    missionDoneToday,
    totalProblems: problems.length,
    weeklySolved,
    accuracy,
    avgTime: formatMinutes(avgMinutes),
    studyTimeToday: formatMinutes(studyMinutesToday),
  };
}

function sortMissionProblems(problems) {
  const yesterday = yesterdayKey();

  return [...problems].sort((a, b) => {
    if (a.missionDone !== b.missionDone) return a.missionDone ? 1 : -1;

    const aCarry = a.missionDate === yesterday && !a.missionDone;
    const bCarry = b.missionDate === yesterday && !b.missionDone;
    if (aCarry !== bCarry) return aCarry ? -1 : 1;

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

function mapRevisionMissionItem(p, today, yesterday) {
  let due = "Scheduled";
  if (p.missionDate === yesterday && !p.missionDone) {
    due = "From yesterday";
  } else if (p.nextReviewAt) {
    const reviewDay = p.nextReviewAt.slice(0, 10);
    if (reviewDay < today) due = "Overdue";
    else if (reviewDay === today) due = "Today";
  }

  const reviewStage = p.reviewStage ?? 0;

  return {
    id: p.id,
    title: p.title,
    topic: [p.topic, p.pattern].filter(Boolean).join(" · "),
    difficulty: p.difficulty,
    type: "revision",
    due,
    reviewLabel: getRevisionRoundLabel(reviewStage),
    reviewStage,
    done: p.missionDone,
    carriedOver: p.missionDate === yesterday && !p.missionDone,
    time: p.actualSolveMinutes ? `${p.actualSolveMinutes}m` : `${p.estimatedMinutes || 30}m`,
    leetcodeUrl: p.leetcodeUrl || null,
    leetcodeSlug: p.leetcodeSlug || null,
    startedAt: p.startedAt || null,
    actualSolveMinutes: p.actualSolveMinutes ?? null,
  };
}

function sortMissionItems(items) {
  const typeOrder = { learning: 0, revision: 1 };

  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.carriedOver !== b.carriedOver) return a.carriedOver ? -1 : 1;

    const ta = typeOrder[a.type] ?? 2;
    const tb = typeOrder[b.type] ?? 2;
    if (ta !== tb) return ta - tb;

    return 0;
  });
}

export function computeTodaysMission() {
  const today = todayKey();
  const yesterday = yesterdayKey();

  const revisionItems = sortMissionProblems(getTodaysMissionProblems())
    .map((p) => mapRevisionMissionItem(p, today, yesterday));

  const learningItem = computeLearningMissionItem();
  const items = learningItem ? [learningItem, ...revisionItems] : revisionItems;

  return sortMissionItems(items);
}

export function computeProblemsSolvedOnDate(dateKey) {
  if (!dateKey) return [];

  const problems = getProblems();
  const solvedIds = new Set();

  problems.forEach((p) => {
    if (p.solvedAt?.slice(0, 10) === dateKey) {
      solvedIds.add(p.id);
      return;
    }
    if (p.missionDone && p.lastReviewAt?.slice(0, 10) === dateKey) {
      solvedIds.add(p.id);
    }
  });

  getActivities()
    .filter((a) => a.action === "Solved" && a.timestamp.slice(0, 10) === dateKey)
    .forEach((a) => {
      if (a.problemId) solvedIds.add(a.problemId);
    });

  return problems
    .filter((p) => solvedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      title: p.title,
      topic: p.topic,
      difficulty: p.difficulty,
      minutes: p.actualSolveMinutes || p.estimatedMinutes || null,
    }));
}

export function computeRecentActivity(limit = 5) {
  return getActivities().slice(0, limit).map((a) => ({
    action: a.action,
    problem: a.problemTitle,
    topic: a.topic,
    time: formatRelativeTime(a.timestamp),
  }));
}

export function computeTopicProgress({ limit = 8 } = {}) {
  const problems = getProblems();
  const map = new Map();

  problems.forEach((p) => {
    const label = resolveProblemTopic(p);
    const key = normalizeTopicKey(label);
    if (!map.has(key)) {
      map.set(key, { name: label, solved: 0, total: 0, isUncategorized: label === "Uncategorized" });
    }
    const entry = map.get(key);
    entry.total += 1;
    if (isProblemMarkedDone(p)) entry.solved += 1;
  });

  return [...map.values()]
    .map((t) => ({
      ...t,
      pending: t.total - t.solved,
      percent: t.total ? Math.round((t.solved / t.total) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.isUncategorized !== b.isUncategorized) {
        return a.isUncategorized ? 1 : -1;
      }
      if (a.percent !== b.percent) return a.percent - b.percent;
      if (b.pending !== a.pending) return b.pending - a.pending;
      return b.total - a.total;
    })
    .slice(0, limit);
}

export function hasMeaningfulTopicProgress(topics = []) {
  return topics.some((t) => !t.isUncategorized);
}

export function computePatternStats() {
  const problems = getProblems();
  const tallies = new Map(
    PATTERN_CATALOG.map((template) => [template.name, { ...template, problems: 0, solved: 0 }]),
  );

  for (const problem of problems) {
    const patternName = resolveProblemPattern(problem);
    if (!patternName || !tallies.has(patternName)) continue;
    const entry = tallies.get(patternName);
    entry.problems += 1;
    if (isProblemMarkedDone(problem)) entry.solved += 1;
  }

  return PATTERN_CATALOG.map((template) => {
    const entry = tallies.get(template.name);
    const total = entry?.problems || 0;
    const solved = entry?.solved || 0;
    return {
      ...template,
      problems: total,
      solved,
      mastery: total ? Math.round((solved / total) * 100) : 0,
    };
  });
}

export function computeWeeklyActivity() {
  const activities = getActivities();
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const dayActs = activities.filter((a) => a.timestamp.slice(0, 10) === key);
    const solved = dayActs.filter((a) => a.action === "Solved").length;
    result.push({
      day: DAY_NAMES[d.getDay()],
      date: key,
      solved,
      minutes: dayActs.length * 20,
      isToday: key === todayKey(),
    });
  }

  return result;
}

export function computeDifficultyBreakdown() {
  const problems = getProblems();
  const solved = problems.filter(isProblemMarkedDone);
  const solvedTotal = solved.length || 1;
  const levels = [
    { label: "Easy", color: "easy", key: "Easy" },
    { label: "Medium", color: "medium", key: "Medium" },
    { label: "Hard", color: "hard", key: "Hard" },
  ];

  return levels.map((l) => {
    const count = solved.filter(
      (p) => normalizeProblemDifficulty(p.difficulty) === l.key,
    ).length;
    return { ...l, count, percent: Math.round((count / solvedTotal) * 100) };
  });
}

export function computeCalendarDays(year, month) {
  const total = daysInMonth(year, month);
  const today = todayKey();
  const firstDow = new Date(year, month, 1).getDay();
  const activities = getActivities();

  const days = [];
  for (let i = 1; i <= total; i++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const solved = computeProblemsSolvedOnDate(key);
    const dayActs = activities.filter((a) => a.timestamp.slice(0, 10) === key);
    const activity = solved.length
      ? Math.min(solved.length, 3)
      : (dayActs.length > 0 ? Math.min(dayActs.length, 3) : 0);
    const hasReview = getProblems().some((p) => p.nextReviewAt?.slice(0, 10) === key);
    const d = new Date(year, month, i);

    days.push({
      day: i,
      dateKey: key,
      activity,
      solvedCount: solved.length,
      isToday: key === today,
      hasReview,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isFuture: key > today,
      offset: i === 1 ? firstDow : 0,
    });
  }

  return { days, firstDow, total };
}

export function computeUpcomingReviews() {
  const today = todayKey();
  const problems = getProblems()
    .filter((p) => isRevisionEligible(p) && p.nextReviewAt && p.nextReviewAt.slice(0, 10) >= today)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));

  const map = new Map();

  problems.forEach((p) => {
    const label = formatDateLabel(p.nextReviewAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(p.title);
  });

  return [...map.entries()]
    .slice(0, 6)
    .map(([date, titles]) => ({ date, count: titles.length, problems: titles }));
}

export function searchAll(query) {
  const q = query?.trim().toLowerCase();
  if (!q) return { problems: [], patterns: [], notes: [] };

  const problems = getProblems()
    .filter((p) =>
      String(p.title || "").toLowerCase().includes(q)
      || String(p.topic || "").toLowerCase().includes(q)
      || String(p.pattern || "").toLowerCase().includes(q)
    )
    .map((p) => ({
      id: p.id,
      title: p.title,
      topic: p.topic,
      difficulty: p.difficulty,
      status: p.status,
    }));

  const patternStats = computePatternStats();
  const patterns = patternStats
    .filter((p) => p.name.toLowerCase().includes(q))
    .map((p) => ({ title: p.name, count: p.problems }));

  const notes = getDB().notes
    .filter((n) =>
      String(n.title || "").toLowerCase().includes(q)
      || String(n.content || "").toLowerCase().includes(q)
    )
    .map((n) => ({
      id: n.id,
      title: n.title,
      problem: n.problemTitle || "General",
      date: formatRelativeTime(n.createdAt),
    }));

  return { problems, patterns, notes };
}

export function filterProblems(filters = {}) {
  let list = getProblems();

  if (filters.difficulty) {
    list = list.filter((p) => p.difficulty === filters.difficulty);
  }
  if (filters.topic) {
    list = list.filter((p) => p.topic.toLowerCase().includes(filters.topic.toLowerCase()));
  }
  if (filters.status) {
    list = list.filter((p) => p.status === filters.status);
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    list = list.filter((p) =>
      p.title.toLowerCase().includes(q)
      || p.topic.toLowerCase().includes(q)
      || p.pattern.toLowerCase().includes(q)
    );
  }

  return list;
}