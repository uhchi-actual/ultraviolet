"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { batchAnalyzeStream, cancelBatchAnalyze } from "@/lib/api";
import type { BatchAnalyzeEvent } from "@/lib/types";

export function BatchImportPanel() {
  const [directory, setDirectory] = useState("D:/Music");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BatchAnalyzeEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleStart = useCallback(async () => {
    if (!directory.trim()) {
      setError("Enter a folder path containing your music library.");
      return;
    }
    setRunning(true);
    setDone(false);
    setError(null);
    setProgress(null);
    abortRef.current = new AbortController();

    try {
      await batchAnalyzeStream(
        {
          directory: directory.trim(),
          recursive: true,
          skip_existing: true,
          purge_demo: true,
        },
        (event) => setProgress(event),
        abortRef.current.signal,
      );
      setDone(true);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Batch import stopped.");
      } else {
        setError(err instanceof Error ? err.message : "Batch import failed.");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [directory]);

  async function handleStop() {
    abortRef.current?.abort();
    try {
      await cancelBatchAnalyze();
    } catch {
      /* backend may already be done */
    }
  }

  const total = progress?.total_files ?? 0;
  const completed = (progress?.completed ?? 0) + (progress?.skipped ?? 0);
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <section className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
      <h2 className="text-lg font-semibold text-uv-text-primary">Batch Import</h2>
      <p className="mt-2 text-sm text-uv-text-secondary">
        Point at a folder of MP3/FLAC/WAV files. Each track is analyzed with Demucs + librosa
        and added to your catalog. Fake demo tracks are removed on first import.
      </p>

      <label className="mt-4 block text-sm text-uv-text-secondary">
        Music folder path
        <input
          type="text"
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          disabled={running}
          placeholder="D:/Music/Library"
          className="mt-1 w-full rounded-lg border border-uv-border bg-uv-bg-base px-3 py-2 text-sm text-uv-text-primary placeholder:text-uv-text-muted focus:border-uv-purple-bright focus:outline-none"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={running}
          className="rounded-lg bg-uv-purple-bright px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {running ? "Importing…" : "Import Music Library"}
        </button>
        {running ? (
          <button
            type="button"
            onClick={handleStop}
            className="rounded-lg border border-uv-border px-4 py-2 text-sm text-uv-text-secondary hover:border-uv-error hover:text-uv-error"
          >
            Stop
          </button>
        ) : null}
      </div>

      {running || progress ? (
        <div className="mt-5 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-uv-bg-base">
            <div
              className="h-full bg-uv-purple-bright transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-uv-text-secondary">
            {progress?.status === "processing" ? (
              <>
                <span className="text-uv-text-primary">{progress.current_file || "Scanning…"}</span>
                {" · "}
                {progress.completed ?? 0} analyzed
                {(progress.skipped ?? 0) > 0 ? `, ${progress.skipped} skipped` : ""}
                {total > 0 ? ` of ${total}` : ""}
              </>
            ) : progress?.status === "purged_demo" ? (
              <>Removed {progress.removed} fake demo tracks from catalog.</>
            ) : null}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-uv-error">{error}</p>
      ) : null}

      {done && progress?.status === "complete" ? (
        <div className="mt-4 rounded-lg border border-uv-border-strong/40 bg-uv-bg-base/60 p-4 text-sm text-uv-text-secondary">
          <p>
            Imported <strong className="text-uv-text-primary">{progress.total_analyzed}</strong> tracks.
            Catalog now has <strong className="text-uv-text-primary">{progress.catalog_size}</strong> tracks
            {progress.duration_seconds
              ? ` in ${Math.round(progress.duration_seconds / 60)} min`
              : ""}
            .
          </p>
          <p className="mt-2">
            <Link href="/tree" className="text-uhchi-secondary underline-offset-4 hover:underline">
              Generate a Tree →
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}
