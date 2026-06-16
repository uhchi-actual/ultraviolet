import type { IdentifierCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface IdentifierBadgeProps {
  name: string;
  category?: IdentifierCategory;
  className?: string;
}

/** Styled badge for an identifier name; custom-niche identifiers get the UV accent. */
export function IdentifierBadge({ name, category, className }: IdentifierBadgeProps) {
  const niche = category === "Custom Niche";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-uv-bg-elevated px-2 py-0.5 font-mono text-xs",
        niche ? "border-uv-border-strong" : "border-uv-border",
        className,
      )}
    >
      <span className={niche ? "uv-gradient-text" : "text-uv-text-secondary"}>{name}</span>
    </span>
  );
}
