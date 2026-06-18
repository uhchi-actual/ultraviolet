"use client";

import { CatalogProgressBanner } from "@/components/CatalogProgressBanner";

/** Detailed panel on Analyze — banner in layout covers global progress. */
export function FmaPipelinePanel() {
  return (
    <section className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-1">
      <CatalogProgressBanner />
    </section>
  );
}
