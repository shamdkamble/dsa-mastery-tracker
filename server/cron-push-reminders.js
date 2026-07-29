/**
 * Shared handler for the production cron job.
 * Hobby: once daily (vercel.json `0 3 * * *` + CRON_BATCH_MODE=daily).
 * Pro: can switch back to hourly + CRON_BATCH_MODE unset for local-hour stagger.
 */

import { verifyCronRequest, getCronScheduleMeta } from "./cron-auth.js";
import { runScheduledPushReminders } from "./push-reminders.js";
import { runDailyWisdomDelivery } from "./learning-wisdom-daily.js";
import { runAccountExpiryChecks } from "./account-expiry-cron.js";

function headerValue(req, name) {
  const raw = req.headers[name];
  if (Array.isArray(raw)) return raw[0] || "";
  return String(raw || "");
}

function isDailyBatchMode() {
  return process.env.CRON_BATCH_MODE === "daily";
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function handleCronPushReminders(req, res) {
  const auth = verifyCronRequest(req);

  if (!auth.ok) {
    console.warn("[/api/cron/push-reminders] unauthorized", auth.reason);
    res.status(401).json({
      error: { message: "Unauthorized.", code: "UNAUTHORIZED", reason: auth.reason },
    });
    return;
  }

  const startedAt = new Date().toISOString();
  const vercelSchedule = headerValue(req, "x-vercel-cron-schedule");
  const utcHour = new Date().getUTCHours();
  // Daily Hobby cron: always run expiry. Hourly Pro: only at UTC midnight hour.
  const runAccountExpiry = isDailyBatchMode() || utcHour === 0;

  console.info("[/api/cron/push-reminders] start", {
    startedAt,
    via: auth.via,
    schedule: vercelSchedule || getCronScheduleMeta().scheduleUtc,
    batchMode: isDailyBatchMode() ? "daily" : "hourly",
    utcHour,
    runAccountExpiry,
  });

  try {
    const [reminders, dailyWisdom, accountExpiry] = await Promise.all([
      runScheduledPushReminders(),
      runDailyWisdomDelivery(),
      runAccountExpiry ? runAccountExpiryChecks() : Promise.resolve({ skipped: true, reason: "off_peak_hour" }),
    ]);

    const payload = {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      via: auth.via,
      schedule: getCronScheduleMeta(),
      reminders,
      dailyWisdom,
      accountExpiry,
    };

    console.info("[/api/cron/push-reminders] done", {
      remindersSent: reminders?.sent ?? 0,
      reminderTypes: reminders?.types ?? [],
      wisdomSent: dailyWisdom?.sent ?? 0,
      expiryNotified: accountExpiry?.notified ?? 0,
    });

    res.json(payload);
  } catch (err) {
    console.error("[/api/cron/push-reminders]", err);
    res.status(500).json({ error: { message: "Cron job failed.", code: "SERVER_ERROR" } });
  }
}