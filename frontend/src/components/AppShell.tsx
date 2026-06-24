"use client";

import { SpiderWebCursor } from "@/components/SpiderWebCursor";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SpiderWebCursor />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">{children}</main>
    </>
  );
}
