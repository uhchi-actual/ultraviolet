"use client";

import { useRef, useState } from "react";

import { ingestData } from "@/lib/api";
import type { IngestDataType, IngestResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPT = ".json,.csv,.txt,application/json,text/plain";

const DATA_TYPES: { value: IngestDataType; label: string }[] = [
  { value: "spotify_history", label: "Spotify history" },
  { value: "personal_text", label: "Personal text" },
];

export function IngestPanel({ onIngested }: { onIngested: (r: IngestResponse) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dataType, setDataType] = useState<IngestDataType>("spotify_history");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(file: File) {
    setBusy(true);
    setError(null);
    try {
      onIngested(await ingestData(file, dataType));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingestion failed");
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (files && files.length > 0) void submit(files[0]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-uv-text-muted">
          Data type
        </span>
        {DATA_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            disabled={busy}
            onClick={() => setDataType(t.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
              dataType === t.value
                ? "border-transparent uv-gradient-bg text-white"
                : "border-uv-border-strong text-uv-text-secondary hover:text-uv-text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!busy && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-uv-purple-bright bg-uv-bg-elevated"
            : "border-uv-border-strong bg-uv-bg-surface/60 hover:border-uv-purple-bright hover:bg-uv-bg-surface",
          busy && "pointer-events-none opacity-70",
        )}
      >
        <span className="uv-gradient-bg flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_0_1.25rem_var(--uv-glow)]">
          {busy ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <div>
          <p className="font-display text-base font-medium text-uv-text-primary">
            {busy ? "Reading your taste…" : "Drop your data file, or click to browse"}
          </p>
          <p className="mt-1 font-mono text-xs text-uv-text-muted">
            {busy
              ? "Embedding history + synthesizing your profile with the local LLM"
              : "Spotify streaming history (JSON) · or a personal text file"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-uv-error/40 bg-uv-error/10 px-3 py-2 text-sm text-uv-error">
          {error}
        </p>
      )}
    </div>
  );
}
