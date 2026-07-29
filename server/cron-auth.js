/**
 * Verify Vercel Cron (or manual) invocations of /api/cron/*
 */

import { REMINDER_SCHEDULE } from "./push-reminders.js";
import { DAILY_WISDOM_SCHEDULE } from "./learning-wisdom-daily.js";

function headerValue(req, name) {
  const raw = req.headers[name];
  if (Array.isArray(raw)) return raw[0] || "";
  return String(raw || "");
}

/**
 * @param {import("express").Request | { headers: Record<string, string | string[] | undefined> }} req
 * @returns {{ ok: boolean, via?: string, reason?: string }}
 */
export function verifyCronRequest(req) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = headerValue(req, "authorization").trim();
  const vercelSchedule = headerValue(req, "x-vercel-cron-schedule");

  if (secret) {
    if (auth === `Bearer ${secret}`) {
      return { ok: true, via: "cron-secret" };
    }
    return { ok: false, reason: "invalid_cron_secret" };
  }

  if (process.env.VERCEL === "1" && vercelSchedule) {
    console.warn("[cron-auth] CRON_SECRET is not set — allowing verified Vercel cron header");
    return { ok: true, via: "vercel-cron-schedule" };
  }

  return { ok: false, reason: "cron_secret_missing" };
}

export function getCronScheduleMeta() {
  const dailyBatch = process.env.CRON_BATCH_MODE === "daily";

  if (dailyBatch) {
    return {
      scheduleUtc: "0 3 * * *",
      scheduleLabel:
        "Once daily ~03:00 UTC (Hobby plan). Batch mode sends all eligible daily pushes in one run.",
      planNote:
        "Vercel Hobby allows one cron run per day. Upgrade to Pro for hourly local-hour stagger.",
      localExamples: {
        ist: {
          batchWindow: "08:30–09:29 IST (UTC 03:00–03:59)",
          "daily-wisdom": "included in daily batch",
          "daily-mission": "included in daily batch",
          "review-due": "included in daily batch",
          "weekly-summary": "Sunday batch only",
          "streak-risk": "included in daily batch",
          "account-expiry": "included in daily batch",
        },
      },
      jobs: [
        "Daily Wisdom (batch)",
        "Today's mission (batch)",
        "Reviews due (batch)",
        "Weekly summary (Sunday, batch)",
        "Streak at risk (batch)",
        "Account expiry (batch)",
      ],
      userReminderTargets: {
        "daily-wisdom": "daily batch",
        "daily-mission": "daily batch",
        "review-due": "daily batch",
        "weekly-summary": "Sunday batch",
        "streak-risk": "daily batch",
      },
    };
  }

  return {
    scheduleUtc: "0 * * * *",
    scheduleLabel: "Hourly at :00 UTC — each user gets notifications in their own local hour (Pro)",
    localExamples: {
      ist: {
        "daily-wisdom": "07:00 IST",
        "daily-mission": "09:00 IST",
        "review-due": "14:00 IST",
        "weekly-summary": "Sunday 18:00 IST",
        "streak-risk": "20:00 IST",
        "account-expiry": "05:30 IST (UTC midnight batch)",
      },
    },
    jobs: [
      "Daily Wisdom (07:00 user local)",
      "Today's mission (09:00 user local)",
      "Reviews due (14:00 user local)",
      "Weekly summary (Sunday 18:00 user local)",
      "Streak at risk (20:00 user local)",
      "Account expiry (once daily, UTC 00:00)",
    ],
    userReminderTargets: {
      "daily-wisdom": `${DAILY_WISDOM_SCHEDULE.label} user local`,
      "daily-mission": `${REMINDER_SCHEDULE["daily-mission"].label} user local`,
      "review-due": `${REMINDER_SCHEDULE["review-due"].label} user local`,
      "weekly-summary": REMINDER_SCHEDULE["weekly-summary"].label,
      "streak-risk": `${REMINDER_SCHEDULE["streak-risk"].label} user local`,
    },
  };
}