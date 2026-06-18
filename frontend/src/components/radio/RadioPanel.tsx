"use client";

import { useCallback, useEffect, useState } from "react";

import { getCatalog, postRadio } from "@/lib/api";
import type { CatalogTrack, RadioResponse } from "@/lib/types";

import { RecommendationCard } from "@/components/radio/RecommendationCard";
import { PageHeader } from "@/components/shared/PageHeader";

const LAST_SEED_KEY = "ultraviolet_last_seed";

export function RadioPanel() {
  const [catalog, setCatalog] = useState<CatalogTrack[]>([]);
  const [seedId, setSeedId] = useState("");
  const [obscurity, setObscurity] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RadioResponse | null>(null);

  useEffect(() => {
    const last = localStorage.getItem(LAST_SEED_KEY);
    getCatalog()
      .then((data) => {
        setCatalog(data.tracks);
        if (last && data.tracks.some((t) => t.track_id === last)) {
          setSeedId(last);
        } else if (data.tracks.length > 0) {
          setSeedId(data.tracks[0].track_id);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const runRadio = useCallback(async () => {
    if (!seedId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postRadio(seedId, 16, obscurity / 100);
      setResult(data);
      localStorage.setItem(LAST_SEED_KEY, seedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Radio failed");
    } finally {
      setLoading(false);
    }
  }, [seedId, obscurity]);

  const seed = catalog.find((t) => t.track_id === seedId);

  return (
    <div>
      <PageHeader
        eyebrow="Radio mode"
        title="Radio"
        description="Seed a track from your catalog and get niche recommendations with provenance chains explaining each match."
      />

      <section className="mb-8 rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-uv-text-muted">
              Seed track
            </span>
            <select
              value={seedId}
              onChange={(e) => setSeedId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-2 text-uv-text-primary"
            >
              {catalog.map((t) => (
                <option key={t.track_id} value={t.track_id}>
                  {t.title} — {t.artist}
                  {t.source === "user_upload" ? " (your upload)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-uv-text-muted">
              Obscurity dial — {obscurity}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={obscurity}
              onChange={(e) => setObscurity(Number(e.target.value))}
              className="mt-4 w-full accent-uv-purple-bright"
            />
            <p className="mt-1 text-xs text-uv-text-muted">
              Higher = more deep cuts from artists under 1k monthly listeners
            </p>
          </label>
        </div>

        <button
          type="button"
          onClick={runRadio}
          disabled={loading || !seedId}
          className="mt-5 rounded-lg bg-uv-gradient px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate recommendations"}
        </button>

        {seed ? (
          <p className="mt-3 text-sm text-uv-text-secondary">
            Seeding from <strong className="text-uv-text-primary">{seed.title}</strong> by{" "}
            {seed.artist}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-lg border border-uhchi-primary/40 bg-uhchi-primary/10 px-3 py-2 text-sm text-uhchi-red-bright">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-uv-text-primary">
            {result.recommendations.length} recommendations
          </h2>
          {result.recommendations.map((rec) => (
            <RecommendationCard key={rec.track_id} rec={rec} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
