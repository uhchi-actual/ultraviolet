import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
}

/** Surface card that glows violet on hover (PRD §7.4: glow over shadow). */
export function GlowCard({ children, className }: GlowCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-uv-indigo-mid bg-uv-bg-surface/70 p-6 backdrop-blur-sm",
        "transition-all duration-300 hover:border-uv-purple-bright",
        "hover:shadow-[0_0_2rem_var(--uv-glow)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
