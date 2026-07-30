"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Map,
  BookOpen,
  Sparkles,
  Code2,
  Dumbbell,
  RefreshCw,
  NotebookPen,
  AlertTriangle,
  Trophy,
  Settings,
  Menu,
  X,
  Rocket,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { USER_PROFILE } from "@/data/profile";
import { useProgress } from "@/lib/progress-store";
import { getDsaMantraHomeUrl } from "@/lib/dsa-mantra-auth";

const COLLAPSE_KEY = "engineeros-sidebar-collapsed";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Target,
  Map,
  BookOpen,
  Sparkles,
  Code2,
  Dumbbell,
  RefreshCw,
  NotebookPen,
  AlertTriangle,
  Trophy,
  Settings,
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/mission", label: "Today's Mission", icon: "Target" },
  { href: "/roadmap", label: "Weekly Roadmap", icon: "Map" },
  { href: "/textbook", label: "Interactive Textbook", icon: "BookOpen" },
  { href: "/playground", label: "Visual Playground", icon: "Sparkles" },
  { href: "/problems", label: "Problem Solving", icon: "Code2" },
  { href: "/practice", label: "Practice", icon: "Dumbbell" },
  { href: "/revision", label: "Revision", icon: "RefreshCw" },
  { href: "/journal", label: "Journal", icon: "NotebookPen" },
  { href: "/mistakes", label: "Mistake Notebook", icon: "AlertTriangle" },
  { href: "/achievements", label: "Achievements", icon: "Trophy" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

export function Sidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}) {
  const pathname = usePathname();
  const { progress } = useProgress();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dsaHome = getDsaMantraHomeUrl();

  const toggleCollapsed = useCallback(() => {
    onCollapsedChange(!collapsed);
  }, [collapsed, onCollapsedChange]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const content = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-5",
          collapsed ? "flex-col px-2" : "px-4"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center gap-3 group",
            collapsed && "justify-center"
          )}
          onClick={() => setMobileOpen(false)}
          title="EngineerOS"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-base font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                EngineerOS
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Mission Control
              </div>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "hidden lg:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors",
            collapsed ? "mt-1" : "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-sm font-medium text-white truncate">
            {progress.name || USER_PROFILE.name}
          </div>
          <div className="mt-1 text-xs text-indigo-300">
            {USER_PROFILE.currentMission}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              W{progress.currentWeek} · D{progress.currentDay}
            </span>
            <span className="text-cyan-300/90">{progress.missionProgress}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
              style={{ width: `${progress.missionProgress}%` }}
            />
          </div>
        </div>
      )}

      {collapsed && (
        <div className="mx-auto mb-3 h-1.5 w-8 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
            style={{ width: `${progress.missionProgress}%` }}
          />
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={item.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                collapsed && "justify-center px-2",
                active
                  ? "bg-indigo-500/15 text-white border border-indigo-500/25 shadow-sm shadow-indigo-500/10"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100 border border-transparent"
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active && "text-indigo-300"
                  )}
                />
              )}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "border-t border-white/5 p-3 space-y-2",
          collapsed && "px-2"
        )}
      >
        <a
          href={dsaHome}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors",
            collapsed && "justify-center px-2"
          )}
          title="Back to DSA Mantra"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>DSA Mantra</span>}
        </a>
        {!collapsed && (
          <div className="px-1 text-[10px] text-zinc-600">
            Progress in MongoDB · same as DSA Mantra
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl glass lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 flex-col glass-strong border-r border-white/10 transition-[width] duration-300 ease-out",
          collapsed ? "w-[72px]" : "w-72"
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 glass-strong border-r border-white/10 transition-transform duration-300 lg:hidden",
          mobileOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none"
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/5"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Force expanded labels on mobile */}
        <div className="h-full [&_.truncate]:whitespace-normal">
          <SidebarMobileBody
            pathname={pathname}
            progress={progress}
            onNavigate={() => setMobileOpen(false)}
            dsaHome={dsaHome}
          />
        </div>
      </aside>
    </>
  );
}

function SidebarMobileBody({
  pathname,
  progress,
  onNavigate,
  dsaHome,
}: {
  pathname: string;
  progress: { name: string; currentWeek: number; currentDay: number; missionProgress: number };
  onNavigate: () => void;
  dsaHome: string;
}) {
  return (
    <div className="flex h-full flex-col pt-2">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-white">EngineerOS</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Mission Control
            </div>
          </div>
        </Link>
      </div>
      <div className="mx-4 mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="text-sm font-medium text-white">
          {progress.name || USER_PROFILE.name}
        </div>
        <div className="mt-1 text-xs text-indigo-300">{USER_PROFILE.currentMission}</div>
        <div className="mt-2 text-[11px] text-zinc-500">
          W{progress.currentWeek} · D{progress.currentDay} · {progress.missionProgress}%
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                active
                  ? "bg-indigo-500/15 text-white border border-indigo-500/25"
                  : "text-zinc-400 hover:bg-white/5 border border-transparent"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 p-4">
        <a href={dsaHome} className="flex items-center gap-2 text-xs text-zinc-400">
          <ExternalLink className="h-3.5 w-3.5" /> DSA Mantra
        </a>
      </div>
    </div>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const onCollapsedChange = useCallback((value: boolean) => {
    setCollapsed(value);
    try {
      localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  return { collapsed, onCollapsedChange };
}
