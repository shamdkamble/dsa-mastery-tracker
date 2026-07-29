import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "success" | "warning" | "accent" | "danger";
}) {
  const tones = {
    default: "bg-white/10 text-zinc-200 border-white/10",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    accent: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
    danger: "bg-red-500/15 text-red-300 border-red-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
