import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "rounded-lg border border-uv-border bg-uv-bg-primary px-3 py-2 text-sm text-uv-text-primary",
        "placeholder:text-uv-text-muted focus:border-uv-purple-bright focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
