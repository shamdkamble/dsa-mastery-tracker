"use client";

import { useProgress } from "@/lib/progress-store";
import { USER_PROFILE } from "@/data/profile";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { progress, updateSettings, resetProgress, syncStatus, forceSync } =
    useProgress();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
          Settings
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Preferences</h1>
        <p className="mt-1 text-zinc-400">
          Cloud progress via DSA Mantra MongoDB · admin learning OS
        </p>
      </div>

      <Card>
        <CardTitle>Profile</CardTitle>
        <CardDescription className="mt-1">Fixed mission context</CardDescription>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Item label="Name" value={progress.name || USER_PROFILE.name} />
          <Item label="Experience" value={USER_PROFILE.experience} />
          <Item label="Language" value={USER_PROFILE.language} />
          <Item label="Mission" value={USER_PROFILE.currentMission} />
          <Item label="Goal" value={USER_PROFILE.currentGoal} />
          <Item label="Package" value={USER_PROFILE.dreamPackage} />
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {USER_PROFILE.dreamCompanies.map((c) => (
            <Badge key={c} tone="accent">
              {c}
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Cloud sync</CardTitle>
        <CardDescription className="mt-1">
          Progress is stored in the same MongoDB as DSA Mantra (collection{" "}
          <code className="text-indigo-300">engineer_os_progress</code>).
        </CardDescription>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-zinc-400">
            Status:{" "}
            <strong className="text-white">
              {syncStatus === "synced"
                ? "Synced"
                : syncStatus === "syncing"
                  ? "Syncing…"
                  : syncStatus === "offline"
                    ? "Offline (local cache)"
                    : syncStatus === "error"
                      ? "Sync error"
                      : "Idle"}
            </strong>
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={() => void forceSync()}>
            Sync now
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Study defaults</CardTitle>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Daily goal (minutes): {progress.settings.dailyGoalMinutes}
            </label>
            <input
              type="range"
              min={30}
              max={300}
              step={15}
              value={progress.settings.dailyGoalMinutes}
              onChange={(e) =>
                updateSettings({ dailyGoalMinutes: Number(e.target.value) })
              }
              className="w-full accent-indigo-500"
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={progress.settings.soundEnabled}
              onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
              className="h-4 w-4 rounded accent-indigo-500"
            />
            Sound enabled (reserved for future UI cues)
          </label>
        </div>
      </Card>

      <Card className="border-rose-500/20">
        <CardTitle className="text-rose-200">Danger zone</CardTitle>
        <CardDescription className="mt-1">
          Reset cloud + local EngineerOS progress (journal, mistakes, quizzes). Cannot be undone.
        </CardDescription>
        <Button
          className="mt-4"
          variant="danger"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm("Reset all EngineerOS progress?")
            ) {
              resetProgress();
            }
          }}
        >
          Reset progress
        </Button>
      </Card>

      <p className="text-center text-xs text-zinc-600">
        EngineerOS · offline after load · LocalStorage persistence · Week 1 complete content
      </p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-200">{value}</dd>
    </div>
  );
}
