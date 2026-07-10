/**
 * Sync study reminder preferences with server (for scheduled push)
 */

import { fetchPushPreferences, updatePushPreferences } from "../api/pushApi.js";
import { getToken } from "../auth/session.js";
import { getSettings, updateSettings } from "../storage/db.js";

export const STUDY_PREF_KEYS = ["dailyReminder", "streakAlert", "reviewDue", "weeklySummary"];

export async function hydrateNotificationPreferencesFromServer() {
  if (!getToken()) return;

  try {
    const data = await fetchPushPreferences();
    const preferences = data?.preferences;
    if (!preferences) return;

    const current = getSettings().notifications || {};
    const merged = { ...current };

    STUDY_PREF_KEYS.forEach((key) => {
      if (preferences[key] !== undefined) merged[key] = preferences[key];
    });

    updateSettings({ notifications: merged }, { silent: true });
  } catch (err) {
    console.warn("[notification-prefs] hydrate failed:", err?.message || err);
  }
}

export async function syncNotificationPreferenceToServer(key, value) {
  if (!getToken() || !STUDY_PREF_KEYS.includes(key)) return;

  try {
    await updatePushPreferences({ [key]: value });
  } catch (err) {
    console.warn("[notification-prefs] sync failed:", err?.message || err);
  }
}

export async function syncAllStudyPreferencesToServer() {
  if (!getToken()) return;

  const notifications = getSettings().notifications || {};

  try {
    await updatePushPreferences({
      dailyReminder: Boolean(notifications.dailyReminder),
      streakAlert: Boolean(notifications.streakAlert),
      reviewDue: Boolean(notifications.reviewDue),
      weeklySummary: Boolean(notifications.weeklySummary),
    });
  } catch (err) {
    console.warn("[notification-prefs] bulk sync failed:", err?.message || err);
  }
}