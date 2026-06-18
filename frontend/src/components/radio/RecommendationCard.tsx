"use client";

import Link from "next/link";

import type { Recommendation } from "@/lib/types";

function pct(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

const LABEL: Record<string, string> = {
  tempo: "Tempo",
  key: "Key",
  mode: "Mood",
  energy: "Energy",
  danceability: "Groove",
  instrumentalness: "Instrumental feel",
  loudness_rms: "Loudness",
  texture_density: "Texture",
  rhythmic_complexity: "Rhythm",
  harmonic_darkness: "Darkness",
  vocals_stem: "Vocals",
};

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const isBridge = rec.recommendation_type === "bridge";

  return (
    <article className="rounded-xl border border-uv-border bg-uv-bg-surface/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-uv-text-primary">{rec.title}</h3>
          <p className="text-sm text-uv-text-secondary">{rec.artist}</p>
          {isBridge && rec.bridge_via ? (
            <p className="mt-1 text-xs text-uhchi-secondary">
              Bridge via {rec.bridge_via.title} — {rec.bridge_via.artist}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isBridge ? (
            <span className="rounded-full border border-uhchi-secondary/40 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-uhchi-secondary">
              Bridge
            </span>
          ) : null}
          <span className="rounded-lg bg-uv-bg-elevated px-2.5 py-1 font-mono text-sm text-uv-text-primary">
            {pct(rec.confidence)}
          </span>
        </div>
      </div>

      {rec.tree_chain && rec.tree_chain.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-uv-border pt-4">
          {rec.tree_chain.map((link) => (
            <li key={`${link.identifier}-${link.explanation}`} className="text-sm text-uv-text-secondary">
              <span className="font-mono text-xs uppercase tracking-wider text-uv-purple-bright">
                {LABEL[link.identifier] ?? link.identifier.replace(/_/g, " ")}
              </span>
              <span className="mx-2 text-uv-text-muted">·</span>
              {link.explanation}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <Link
          href="/tree"
          className="text-sm text-uhchi-secondary underline-offset-4 hover:underline"
        >
          View in Tree
        </Link>
      </div>
    </article>
  );
}
