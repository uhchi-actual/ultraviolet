import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "uv-gradient-bg text-white shadow-[0_0_1.25rem_var(--uv-glow)] transition-opacity hover:opacity-90",
  secondary:
    "border border-uv-border-strong text-uv-text-primary hover:border-uv-purple-bright hover:bg-uv-bg-elevated",
  ghost: "text-uv-text-secondary hover:text-uv-text-primary",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
