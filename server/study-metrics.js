/**
 * Server-side study stats for scheduled push reminders
 */

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeStreak(activities) {
  const activeDays = new Set(
    activities
      .map((a) => a.timestamp?.slice(0, 10))
      .filter(Boolean),
  );

  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 365; i += 1) {
    const key = todayKey(cursor);
    if (activeDays.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * @param {Array<object>} problems
 * @param {Array<object>} activities
 */
export function computeStudySnapshot(problems = [], activities = []) {
  const today = todayKey();
  const streak = computeStreak(activities);

  const revisionsDue = problems.filter(
    (p) => p.nextReviewAt && p.nextReviewAt.slice(0, 10) <= today,
  ).length;

  const missionToday = problems.filter(
    (p) => p.inMission && p.missionDate === today,
  );
  const missionPending = missionToday.filter((p) => !p.missionDone).length;

  const solvedToday = activities.some(
    (a) => a.action === "Solved" && a.timestamp?.slice(0, 10) === today,
  );

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weeklySolved = activities.filter(
    (a) => a.action === "Solved" && a.timestamp >= weekAgo,
  ).length;

  const mastered = problems.filter((p) => p.status === "mastered").length;

  return {
    streak,
    revisionsDue,
    missionPending,
    missionTotal: missionToday.length,
    solvedToday,
    weeklySolved,
    mastered,
    totalProblems: problems.length,
  };
}