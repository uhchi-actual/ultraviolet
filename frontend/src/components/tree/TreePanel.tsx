"use client";

import { useState } from "react";

import { buildManualTree } from "@/lib/api";
import type { TreeGraph } from "@/lib/types";

import { PageHeader } from "@/components/shared/PageHeader";
import { ManualTreeBuilder } from "./ManualTreeBuilder";
import { TreeCanvas } from "./TreeCanvas";

export function TreePanel() {
  const [graph, setGraph] = useState<TreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow="Explainable traceback"
        title="Tree"
        description="Branches use in-house Demucs/librosa fingerprints — perceptual similarity + MMR diversity. Each build is a new constellation."
      />

      <div className="mb-5">
        <ManualTreeBuilder
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
          Enter seeds above and generate — each run builds a fresh constellation. Nothing loads from old sessions.
        </p>
      ) : (
        <TreeCanvas graph={graph} />
      )}
    </div>
  );
}
