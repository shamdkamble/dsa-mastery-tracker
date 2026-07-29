/**
 * Dedicated Vercel serverless entry for push / wisdom / expiry cron
 * (Hobby: once daily via vercel.json; set CRON_BATCH_MODE=daily).
 */

import "../../server/env.js";
import { handleCronPushReminders } from "../../server/cron-push-reminders.js";

export const maxDuration = 300;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed.", code: "METHOD_NOT_ALLOWED" } });
    return;
  }

  await handleCronPushReminders(req, res);
}