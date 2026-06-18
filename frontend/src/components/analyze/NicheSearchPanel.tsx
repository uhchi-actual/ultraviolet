"use client";

import { useEffect, useState } from "react";

import { nicheSearch } from "@/lib/api";
import type { AnalyzeResponse, NicheSearchResponse } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  ultraviolet: "Ultraviolet",
  spotify: "Spotify",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  itunes: "Apple Music",
};

export function NicheSearchPanel({ data }: { data: AnalyzeResponse }) {
  const [result, setResult] = useState<NicheSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    nicheSearch({
      track_id: data.track_id,
      title: data.title || undefined,
      artist: data.artist ?? undefined,
      identifiers: data.identifiers,
    })
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data.track_id, data.title, data.artist]);

  return (
    <section className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-uv-purple-bright">
          NicheSearch
        </h3>
        {result ? (
          <span className="font-mono text-[0.65rem] text-uv-text-muted">
            polled in {result.elapsed_ms}ms
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-uv-text-secondary">
        Matches your capture against the local fingerprint catalog (Demucs + librosa). Streaming
        services are only used when ENABLE_STREAMING_IDENTITY=true in .env.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 text-sm text-uv-text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-uv-border-strong border-t-uv-purple-bright" />
          Polling sources…
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-uhchi-red-bright">{error}</p> : null}

      {result ? (
        <div className="mt-4 space-y-4">
          {result.identity_guess ? (
            <div className="rounded-lg border border-uhchi-secondary/40 bg-uhchi-secondary/10 px-4 py-3">
              <p className="font-mono text-[0.62rem] uppercase tracking-wider text-uhchi-teal-bright">
                Best guess
              </p>
              <p className="mt-1 font-display text-base font-semibold text-uv-text-primary">
                {result.identity_guess.title}
              </p>
              <p className="text-sm text-uv-text-secondary">
                {result.identity_guess.artist} · via {SOURCE_LABEL[result.identity_guess.source]}
              </p>
            </div>
          ) : null}
          {result.stem_hints.length > 0 ? (
            <p className="text-xs text-uv-text-muted">
              Stem hints: {result.stem_hints.join(" · ")}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.sources.map((src) => (
              <div
                key={src.source}
                className="rounded-lg border border-uv-border bg-uv-bg-elevated/60 p-3"
              >
                <p className="font-mono text-[0.62rem] uppercase tracking-wider text-uv-text-muted">
                  {SOURCE_LABEL[src.source] ?? src.source}
                </p>
                <p className="mt-1 text-xs text-uv-text-secondary">
                  {src.status === "ok"
                    ? `${src.hits.length} hit${src.hits.length === 1 ? "" : "s"}`
                    : src.status === "skipped"
                      ? src.message ?? "Not configured"
                      : "No matches"}
                </p>
              </div>
            ))}
          </div>

          {result.identity_hits && result.identity_hits.length > 0 ? (
            <>
              <p className="font-mono text-[0.62rem] uppercase tracking-wider text-uv-text-muted">
                Likely matches
              </p>
              <ul className="space-y-2">
                {result.identity_hits.map((hit) => (
                  <li
                    key={`id-${hit.source}-${hit.url}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-uhchi-secondary/30 bg-uhchi-secondary/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-uv-text-primary">
                        {hit.title}
                      </p>
                      <p className="truncate text-xs text-uv-text-muted">
                        {hit.artist} · {SOURCE_LABEL[hit.source] ?? hit.source}
                      </p>
                    </div>
                    <a
                      href={hit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md border border-uv-border px-2 py-1 text-xs text-uhchi-teal-bright hover:bg-uv-bg-elevated"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {result.niche_hits && result.niche_hits.length > 0 ? (
            <>
              <p className="font-mono text-[0.62rem] uppercase tracking-wider text-uv-text-muted">
                Niche / remix leads
              </p>
              <ul className="space-y-2">
                {result.niche_hits.map((hit) => (
                  <li
                    key={`niche-${hit.source}-${hit.url}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-uv-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-uv-text-primary">
                        {hit.title}
                      </p>
                      <p className="truncate text-xs text-uv-text-muted">
                        {hit.artist} · {SOURCE_LABEL[hit.source] ?? hit.source}
                      </p>
                    </div>
                    <a
                      href={hit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md border border-uv-border px-2 py-1 text-xs text-uhchi-teal-bright hover:bg-uv-bg-elevated"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {!result.identity_hits?.length && !result.niche_hits?.length && result.top_hits.length > 0 ? (
            <ul className="space-y-2">
              {result.top_hits.map((hit) => (
                <li
                  key={`${hit.source}-${hit.url}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-uv-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-uv-text-primary">
                      {hit.title}
                    </p>
                    <p className="truncate text-xs text-uv-text-muted">
                      {hit.artist} · {SOURCE_LABEL[hit.source] ?? hit.source} ·{" "}
                      {Math.round(hit.confidence * 100)}% fit
                    </p>
                  </div>
                  <a
                    href={hit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-md border border-uv-border px-2 py-1 text-xs text-uhchi-teal-bright hover:bg-uv-bg-elevated"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          ) : !result.identity_hits?.length && !result.niche_hits?.length ? (
            <p className="text-sm text-uv-text-secondary">
              No matches found. Try Listen again with tab audio enabled, or upload the file directly.
            </p>
          ) : null}

          <details className="text-xs text-uv-text-muted">
            <summary className="cursor-pointer">Queries used</summary>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {result.queries.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </section>
  );
}
