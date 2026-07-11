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
import {
  todayKey,
  yesterdayKey,
  formatRelativeTime,
  formatMinutes,
  formatDateLabel,
  daysInMonth,
} from "./helpers.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const mastered = problems.filter((p) => p.status === "mastered");
  const revisionsDue = problems.filter((p) => p.nextReviewAt && p.nextReviewAt.slice(0, 10) <= today);
  const todaysMission = getTodaysMissionProblems();
  const todaysRevisions = todaysMission.filter((p) => p.missionType === "revision").length;
  const missionDoneToday = todaysMission.filter((p) => p.missionDone).length;

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
    problemsSolved: mastered.length,
    missionDoneToday,
    totalProblems: problems.length,
    weeklySolved,
    accuracy,
    avgTime: formatMinutes(avgMinutes),
    studyTimeToday: formatMinutes(studyMinutesToday),
  };
}

function sortMissionProblems(problems) {
  const today = todayKey();
  const yesterday = yesterdayKey();
  const typeOrder = { new: 0, revision: 1, challenge: 2 };

  return [...problems].sort((a, b) => {
    if (a.missionDone !== b.missionDone) return a.missionDone ? 1 : -1;

    const aCarry = a.missionDate === yesterday && !a.missionDone;
    const bCarry = b.missionDate === yesterday && !b.missionDone;
    if (aCarry !== bCarry) return aCarry ? -1 : 1;

    const aNewToday = a.missionType === "new" && a.missionDate === today && !a.missionDone;
    const bNewToday = b.missionType === "new" && b.missionDate === today && !b.missionDone;
    if (aNewToday !== bNewToday) return aNewToday ? -1 : 1;

    const ta = typeOrder[a.missionType] ?? 1;
    const tb = typeOrder[b.missionType] ?? 1;
    if (ta !== tb) return ta - tb;

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export function computeTodaysMission() {
  const today = todayKey();
  const yesterday = yesterdayKey();

  return sortMissionProblems(getTodaysMissionProblems()).map((p) => {
    let due = "Scheduled";
    if (p.missionDate === yesterday && !p.missionDone) {
      due = "From yesterday";
    } else if (p.nextReviewAt) {
      const reviewDay = p.nextReviewAt.slice(0, 10);
      if (reviewDay < today) due = "Overdue";
      else if (reviewDay === today) due = "Today";
    }
    if (p.missionType === "challenge") due = "Optional";

    return {
      id: p.id,
      title: p.title,
      topic: [p.topic, p.pattern].filter(Boolean).join(" · "),
      difficulty: p.difficulty,
      type: p.missionType || "new",
      due,
      done: p.missionDone,
      carriedOver: p.missionDate === yesterday && !p.missionDone,
      time: p.actualSolveMinutes ? `${p.actualSolveMinutes}m` : `${p.estimatedMinutes || 30}m`,
      leetcodeUrl: p.leetcodeUrl || null,
      leetcodeSlug: p.leetcodeSlug || null,
      startedAt: p.startedAt || null,
      actualSolveMinutes: p.actualSolveMinutes ?? null,
    };
  });
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

export function computeTopicProgress() {
  const problems = getProblems();
  const map = new Map();

  problems.forEach((p) => {
    const topic = p.topic || "Uncategorized";
    if (!map.has(topic)) map.set(topic, { name: topic, solved: 0, total: 0 });
    const entry = map.get(topic);
    entry.total++;
    if (p.status === "mastered") entry.solved++;
  });

  return [...map.values()]
    .map((t) => ({ ...t, percent: t.total ? Math.round((t.solved / t.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}

export function computePatternStats() {
  const problems = getProblems();

  return PATTERN_CATALOG.map((template) => {
    const matched = problems.filter(
      (p) => p.pattern?.toLowerCase() === template.name.toLowerCase()
        || p.pattern?.toLowerCase().includes(template.name.toLowerCase().split(" ")[0])
    );
    const total = matched.length;
    const solved = matched.filter((p) => p.status === "mastered").length;
    const mastery = total ? Math.round((solved / total) * 100) : 0;

    return {
      ...template,
      problems: total,
      solved,
      mastery,
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
  const total = problems.length || 1;
  const levels = [
    { label: "Easy", color: "easy", key: "Easy" },
    { label: "Medium", color: "medium", key: "Medium" },
    { label: "Hard", color: "hard", key: "Hard" },
  ];

  return levels.map((l) => {
    const count = problems.filter((p) => p.difficulty === l.key && p.status === "mastered").length;
    return { ...l, count, percent: Math.round((count / total) * 100) };
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
  const problems = getProblems().filter((p) => p.nextReviewAt);
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
      p.title.toLowerCase().includes(q)
      || p.topic.toLowerCase().includes(q)
      || p.pattern.toLowerCase().includes(q)
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
    .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
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