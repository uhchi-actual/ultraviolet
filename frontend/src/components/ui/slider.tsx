import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Minimal themed range slider (shadcn/ui slider arrives with Radix in a later phase). */
export function Slider({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="range"
      className={cn("w-full cursor-pointer accent-uhchi-primary", className)}
      {...props}
    />
  );
}
