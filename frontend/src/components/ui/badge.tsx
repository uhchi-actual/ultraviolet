import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-uv-indigo-mid bg-uv-bg-elevated px-2.5 py-0.5",
        "font-mono text-xs text-uv-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
