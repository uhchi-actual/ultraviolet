"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getFmaStatus, startFmaPipeline } from "@/lib/api";
import type { FmaPipelineStatus } from "@/lib/types";

function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

type CatalogStatus = {
  status: FmaPipelineStatus | null;
  error: string | null;
  catalogReady: boolean;
  busy: boolean;
  embedPct: number;
  embedEta: string | null;
  refresh: () => Promise<void>;
};

const CatalogStatusContext = createContext<CatalogStatus | null>(null);

export function CatalogStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FmaPipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [embedEtaSec, setEmbedEtaSec] = useState<number | null>(null);
  const rateRef = useRef<{ done: number; ts: number } | null>(null);
  const startedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getFmaStatus();
      setStatus(data);
      setError(null);

      const done = data.embed?.done ?? 0;
      const total = data.embed?.total ?? 0;
      const now = Date.now();
      const prev = rateRef.current;
      if (prev && done > prev.done) {
        const rate = (done - prev.done) / ((now - prev.ts) / 1000);
        if (rate > 0.05 && total > done) {
          setEmbedEtaSec(Math.ceil((total - done) / rate));
        }
      }
      if (data.phase === "embedding" || done > 0) {
        rateRef.current = { done, ts: now };
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot reach backend");
    }
  }, []);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      void startFmaPipeline().catch(() => {});
    }
    void refresh();
    const poll = setInterval(refresh, 1000);
    return () => clearInterval(poll);
  }, [refresh]);

  const embed = status?.embed;
  const embedPct = embed?.total ? Math.min(100, (embed.done / embed.total) * 100) : 0;
  const catalogReady = Boolean(status?.complete);
  const busy =
    Boolean(status?.running) ||
    (!catalogReady && embed?.total ? embed.done < embed.total : false);

  const value: CatalogStatus = {
    status,
    error,
    catalogReady,
    busy,
    embedPct,
    embedEta: embedEtaSec != null ? formatClock(embedEtaSec) : null,
    refresh,
  };

  return <CatalogStatusContext.Provider value={value}>{children}</CatalogStatusContext.Provider>;
}

export function useFmaPipelineStatus(): CatalogStatus {
  const ctx = useContext(CatalogStatusContext);
  if (!ctx) {
    throw new Error("useFmaPipelineStatus must be used within CatalogStatusProvider");
  }
  return ctx;
}
