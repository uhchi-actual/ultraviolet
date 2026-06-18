"use client";

import { useEffect, useState } from "react";

import { catalogCount, loadCatalog } from "@/lib/static/catalog";
import { STATIC_MODE } from "@/lib/static/paths";
import { cn } from "@/lib/utils";

export function HealthPill() {
  const [label, setLabel] = useState(STATIC_MODE ? "Loading catalog…" : "Checking API…");
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (STATIC_MODE) {
      loadCatalog()
        .then(() => {
          setOk(true);
          setLabel(`${catalogCount().toLocaleString()} tracks in-browser`);
        })
        .catch(() => {
          setOk(false);
          setLabel("Catalog failed");
        });
      return;
    }

    let active = true;
    import("@/lib/api")
      .then((api) => api.getHealth())
      .then((health) => {
        if (!active) return;
        const healthy = health.status === "healthy";
        setOk(healthy);
        setLabel(`API ${health.status}`);
      })
      .catch(() => {
        if (!active) return;
        setOk(false);
        setLabel("API offline");
      });
    return () => {
      active = false;
    };
  }, []);

  const dot =
    ok === null ? "bg-uv-warning" : ok ? "bg-uv-success" : "bg-uv-error";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-uv-border bg-uv-bg-elevated px-3 py-1 font-mono text-xs text-uv-text-secondary">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}
