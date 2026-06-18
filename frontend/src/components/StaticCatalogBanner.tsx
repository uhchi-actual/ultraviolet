"use client";

import { useEffect, useState } from "react";

import { catalogCount, loadCatalog } from "@/lib/static/catalog";

export function StaticCatalogBanner() {
  const [count, setCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog()
      .then(() => setCount(catalogCount()))
      .catch((e) => setErr(e instanceof Error ? e.message : "Catalog load failed"));
  }, []);

  if (err) {
    return (
      <div className="sticky top-14 z-40 border-b border-uv-error/40 bg-uv-error/10 px-4 py-2">
        <p className="mx-auto max-w-6xl text-sm text-uv-error">Catalog: {err}</p>
      </div>
    );
  }

  return (
    <div className="sticky top-14 z-40 border-b border-uhchi-secondary/40 bg-uhchi-secondary/10 px-4 py-2">
      <p className="mx-auto max-w-6xl text-sm font-medium text-uhchi-teal-bright">
        {count != null
          ? `Static demo — ${count.toLocaleString()} FMA tracks in-browser. No server. Works from GitHub Pages.`
          : "Loading catalog…"}
      </p>
    </div>
  );
}
