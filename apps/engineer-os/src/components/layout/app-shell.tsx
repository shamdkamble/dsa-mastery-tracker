"use client";

import { Sidebar, useSidebarCollapsed } from "./sidebar";
import { MotivationBar } from "../motivation-bar";
import { AIMentor } from "../ai-mentor";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { collapsed, onCollapsedChange } = useSidebarCollapsed();

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar collapsed={collapsed} onCollapsedChange={onCollapsedChange} />
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-300"
        )}
      >
        <main className="flex-1 px-4 pb-24 pt-16 lg:px-8 lg:pt-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <MotivationBar pageKey={pathname} />
            {children}
          </div>
        </main>
      </div>
      <AIMentor />
    </div>
  );
}
