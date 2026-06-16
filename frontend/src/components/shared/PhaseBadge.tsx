import { cn } from "@/lib/utils";

interface PhaseBadgeProps {
  phase: number;
  label?: string;
  className?: string;
}

/** Small badge indicating which roadmap phase a feature ships in (PRD §14). */
export function PhaseBadge({ phase, label = "Coming in", className }: PhaseBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-uv-indigo-mid bg-uv-bg-elevated px-3 py-1",
        "font-mono text-xs text-uv-text-secondary",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-uhchi-secondary" />
      {label} Phase {phase}
    </span>
  );
}
