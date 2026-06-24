"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { buildManualTree } from "@/lib/api";
import type { TreeGraph } from "@/lib/types";

import {
  DEFAULT_ROTATION_SEEDS,
  ManualTreeBuilder,
  parseSongs,
} from "./ManualTreeBuilder";
import { StreamingSourcesPanel } from "./StreamingSourcesPanel";
import { TreeCanvas } from "./TreeCanvas";

export function TreePanel() {
  const [graph, setGraph] = useState<TreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seedText, setSeedText] = useState(DEFAULT_ROTATION_SEEDS);

  async function buildFromText(text: string) {
    const songs = parseSongs(text);
    if (!songs.length) {
      setError("Enter at least one song.");
      return;
    }
    setSeedText(text);
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
          onUseSeeds={setSeedText}
          onBuild={(text) => {
            void buildFromText(text);
          }}
        />

        <div className="mb-5">
          <ManualTreeBuilder
            seedText={seedText}
            onSeedTextChange={setSeedText}
            onBuilt={(g) => {
              setError(null);
              setGraph(g);
            }}
            onError={setError}
          />
        </div>

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
