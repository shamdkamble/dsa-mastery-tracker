/**
 * Verify Vercel Cron (or manual) invocations of /api/cron/*
 */

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

  // Vercel scheduled invocations include this header (see Vercel cron docs).
  if (process.env.VERCEL === "1" && vercelSchedule) {
    console.warn("[cron-auth] CRON_SECRET is not set — allowing verified Vercel cron header");
    return { ok: true, via: "vercel-cron-schedule" };
  }

  return { ok: false, reason: "cron_secret_missing" };
}

export function getCronScheduleMeta() {
  return {
    scheduleUtc: "30 3 * * *",
    scheduleLabel: "Daily ~03:30 UTC (03:00–03:59 UTC window on Hobby)",
    localExamples: {
      ist: "08:30–09:29 IST (≈09:00 India)",
      est: "22:30–23:29 EST previous evening / 10:30–11:29 PM",
      pst: "19:30–20:29 PST previous evening / 7:30–8:29 PM",
    },
    jobs: [
      "Study push reminders (mission, reviews, streak, weekly summary)",
      "Daily Wisdom delivery",
      "Account expiry notifications",
    ],
    userReminderTargets: {
      "daily-mission": "09:00 user local (batched once daily when cron runs)",
      "review-due": "09:00 user local (batched once daily when cron runs)",
      "streak-risk": "20:00 user local target (batched once daily when cron runs)",
      "weekly-summary": "Sunday 18:00 user local (only on Sundays when cron runs)",
      "daily-wisdom": "09:00 user local (batched once daily when cron runs)",
    },
  };
}