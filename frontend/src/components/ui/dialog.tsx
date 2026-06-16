"use client";

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/** Minimal themed modal (shadcn/ui dialog with Radix arrives in a later phase). */
export function Dialog({ open, onClose, children, className }: DialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-xl border border-uv-border bg-uv-bg-elevated p-6",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("font-display text-lg font-semibold text-uv-text-primary", className)}
      {...props}
    />
  );
}
