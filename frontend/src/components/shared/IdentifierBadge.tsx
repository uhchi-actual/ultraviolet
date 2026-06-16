import type { IdentifierCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface IdentifierBadgeProps {
  name: string;
  category?: IdentifierCategory;
  className?: string;
}

/** Styled badge for an identifier name, color-coded by category (PRD §8.2). */
export function IdentifierBadge({ name, category, className }: IdentifierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs",
        category === "Custom Niche"
          ? "border border-uhchi-teal-dim bg-uv-bg-surface text-uhchi-teal-bright"
          : "border border-uv-indigo-light bg-uv-bg-elevated text-uv-text-secondary",
        className,
      )}
    >
      {name}
    </span>
  );
}
