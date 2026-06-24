"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { buildManualTree } from "@/lib/api";
import { parseTrackLines } from "@/lib/streaming";
import type { TreeGraph } from "@/lib/types";

import { StreamingSourcesPanel } from "./StreamingSourcesPanel";
import { TreeCanvas } from "./TreeCanvas";

export function TreePanel() {
  const [graph, setGraph] = useState<TreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buildFromText(text: string) {
    const songs = parseTrackLines(text).map((track) => ({
      title: track.title,
      artist: track.artist,
    }));
    if (!songs.length) {
      setError("Enter at least one song.");
      return;
    }
    setError(null);
    try {
      const res = await buildManualTree({ songs, recs_per_seed: 12 });
      setGraph(res.tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Build failed");
    }
  }

  return (
    <div className="mx-[calc(50%-50vw+1rem)] sm:mx-[calc(50%-50vw+2rem)]">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Explainable traceback"
          title="Tree"
          description="Paste a rotation, connect a playlist, then move through genre-colored recommendation islands."
        />
      </div>

      <div className="mx-auto max-w-[1500px]">
        <StreamingSourcesPanel
          onBuild={(text) => {
            void buildFromText(text);
          }}
        />

        {error ? <p className="mb-4 text-sm text-uhchi-red-bright">{error}</p> : null}

        {!graph || graph.nodes.length === 0 ? (
          <p className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-6 text-uv-text-secondary">
            Enter seeds above and generate a fresh constellation.
          </p>
        ) : (
          <TreeCanvas graph={graph} />
        )}
      </div>
    </div>
  );
}
