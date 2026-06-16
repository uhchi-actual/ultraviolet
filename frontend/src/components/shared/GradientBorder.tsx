import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GradientBorderProps {
  children: ReactNode;
  className?: string;
}

/** Wraps content in the Ultraviolet indigo→raspberry gradient border (PRD §7.4). */
export function GradientBorder({ children, className }: GradientBorderProps) {
  return (
    <div className={cn("uv-gradient-bg rounded-xl p-px", className)}>
      <div className="h-full w-full rounded-[calc(0.75rem-1px)] bg-uv-bg-surface">
        {children}
      </div>
    </div>
  );
}
