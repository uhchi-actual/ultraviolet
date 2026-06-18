"use client";

import { useState } from "react";

import { buildManualTree } from "@/lib/api";
import type { TreeGraph } from "@/lib/types";

function parseSongs(text: string): { title: string; artist: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((line) => {
      const by = line.match(/^(.+?)\s+[-–—]\s+(.+)$/);
      if (by) return { artist: by[1].trim(), title: by[2].trim() };
      const by2 = line.match(/^(.+?)\s+by\s+(.+)$/i);
      if (by2) return { title: by2[1].trim(), artist: by2[2].trim() };
      return { title: line, artist: "" };
    });
}

export function ManualTreeBuilder({
  onBuilt,
  onError,
}: {
  onBuilt: (graph: TreeGraph) => void;
  onError?: (msg: string) => void;
}) {
  const [text, setText] = useState("New Order - Ceremony");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recsPerSeed, setRecsPerSeed] = useState(12);

  async function handleBuild() {
    const songs = parseSongs(text);
    if (!songs.length) {
      setError("Enter at least one song (one per line).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await buildManualTree({ songs, recs_per_seed: recsPerSeed });
      onBuilt(res.tree);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Build failed";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  const count = parseSongs(text).length;

  return (
    <section className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-uv-purple-bright">
        Manual tree
      </h3>
      <p className="mt-2 text-sm text-uv-text-secondary">
        Type up to <strong className="text-uv-text-primary">50 songs</strong> — one per line. Format:{" "}
        <code className="text-uv-text-primary">Artist - Title</code>. Any song works — we match FMA when
        possible, otherwise CLAP text embeddings. No upload or account needed.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="mt-3 w-full rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-2 font-mono text-sm text-uv-text-primary"
        placeholder={"Chris Stussy - Darkness\nNew Order - Ceremony\nThe Cure - Plainsong"}
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="text-sm text-uv-text-secondary">
          Recs per seed:{" "}
          <input
            type="number"
            min={4}
            max={24}
            value={recsPerSeed}
            onChange={(e) => setRecsPerSeed(Number(e.target.value))}
            className="ml-1 w-14 rounded border border-uv-border bg-uv-bg-elevated px-2 py-1 text-uv-text-primary"
          />
        </label>
        <span className="text-xs text-uv-text-muted">{count} song{count === 1 ? "" : "s"}</span>
        <button
          type="button"
          disabled={loading}
          onClick={handleBuild}
          className="rounded-lg border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-4 py-2 text-sm font-semibold text-uhchi-teal-bright hover:bg-uhchi-secondary/20 disabled:opacity-50"
        >
          {loading ? "Building tree…" : "Generate tree"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-uhchi-red-bright">{error}</p> : null}
    </section>
  );
}
