"use client";

import { StaticCatalogBanner } from "@/components/StaticCatalogBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaticCatalogBanner />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">{children}</main>
    </>
  );
}
