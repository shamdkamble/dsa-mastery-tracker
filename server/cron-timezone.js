/**
 * Timezone helpers for cron-driven notifications
 */

export function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    hour: Number.parseInt(map.hour, 10),
    minute: Number.parseInt(map.minute, 10),
    weekday: weekdayMap[map.weekday] ?? 0,
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

/**
 * Match when the user's local clock is in the scheduled hour (cron runs hourly).
 * @param {{ hour: number, weekday?: number }} schedule
 * @param {{ hour: number, weekday: number }} zoned
 */
export function isDueInLocalHour(schedule, zoned) {
  if (!schedule) return false;
  if (schedule.weekday !== undefined && zoned.weekday !== schedule.weekday) return false;
  return zoned.hour === schedule.hour;
}