"use client";

import { useFmaPipelineStatus } from "@/providers/CatalogStatusProvider";

export function CatalogProgressBanner() {
  const { status, error, catalogReady, busy, embedPct, embedEta } = useFmaPipelineStatus();

  if (error) {
    return (
      <div className="sticky top-14 z-40 border-b border-uv-error/40 bg-uv-error/10 px-4 py-3">
        <p className="mx-auto max-w-6xl text-sm text-uv-error">
          Backend offline — start Ultraviolet with <code className="font-mono">npm run dev</code> to see
          catalog progress.
        </p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="sticky top-14 z-40 border-b border-uv-border bg-uv-bg-surface px-4 py-3">
        <p className="mx-auto max-w-6xl text-sm text-uv-text-secondary">Loading catalog status…</p>
      </div>
    );
  }

  if (catalogReady) {
    return (
      <div className="sticky top-14 z-40 border-b border-uhchi-secondary/40 bg-uhchi-secondary/10 px-4 py-2.5">
        <p className="mx-auto max-w-6xl text-sm font-medium text-uhchi-teal-bright">
          FMA catalog ready — {status.embed.done.toLocaleString()} tracks embedded. You can build a tree.
        </p>
      </div>
    );
  }

  const embed = status.embed;
  const phaseLabel =
    status.phase === "downloading"
      ? "Downloading FMA audio"
      : status.phase === "extracting"
        ? "Extracting zip"
        : status.phase === "embedding"
          ? "Building CLAP embeddings"
          : status.phase;

  return (
    <div className="sticky top-14 z-40 border-b border-uv-purple-bright/50 bg-uv-bg-surface/95 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-uv-text-primary">
            {busy ? "Catalog not ready — tree will fail until this finishes" : "Catalog setup"}
          </p>
          <span className="rounded-full bg-uv-bg-base px-2.5 py-0.5 font-mono text-xs uppercase text-uv-purple-bright">
            {phaseLabel}
          </span>
        </div>

        {status.phase === "downloading" ? (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-uv-text-secondary">
              <span>Download</span>
              <span>
                {status.download.bytes_human} / {status.download.total_human} (
                {status.download.percent.toFixed(1)}%)
              </span>
            </div>
            <div className="mt-1.5 h-4 overflow-hidden rounded-full bg-uv-bg-base">
              <div
                className="h-full bg-uv-purple-bright transition-all duration-500"
                style={{ width: `${Math.min(100, status.download.percent)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-uv-text-muted">
              ETA {status.download.eta_human} · {status.download.speed_mbps.toFixed(1)} MB/s
            </p>
          </div>
        ) : null}

        {embed.total > 0 ? (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-uv-text-primary">
              <span>CLAP embeddings</span>
              <span className="font-mono tabular-nums">
                {embed.done.toLocaleString()} / {embed.total.toLocaleString()} ({embedPct.toFixed(1)}%)
              </span>
            </div>
            <div className="mt-2 h-5 overflow-hidden rounded-full border border-uv-purple-bright/30 bg-uv-bg-base">
              <div
                className="h-full bg-gradient-to-r from-uv-purple-bright to-uhchi-secondary transition-all duration-500"
                style={{ width: `${embedPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-uv-text-secondary">
              {embedEta ? <span>ETA ~{embedEta}</span> : null}
              {status.message ? <span>{status.message}</span> : null}
              {embed.current_title ? <span className="truncate">Now: {embed.current_title}</span> : null}
            </div>
          </div>
        ) : null}

        <p className="mt-2 font-mono text-[10px] text-uv-text-muted">
          Live from disk · {status.download.bytes.toLocaleString()} bytes · updates every 1s
        </p>
      </div>
    </div>
  );
}
