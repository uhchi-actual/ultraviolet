"use client";

import { useEffect, useState } from "react";

import { getHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HealthPill() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((data) => active && setHealth(data))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, []);

  const ok = health?.status === "healthy";
  const dot = error ? "bg-uv-error" : ok ? "bg-uv-success" : "bg-uv-warning";
  const label = error
    ? "API offline"
    : health
      ? `API ${health.status}`
      : "Checking API…";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-uv-indigo-mid bg-uv-bg-elevated px-3 py-1 font-mono text-xs text-uv-text-secondary">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}
