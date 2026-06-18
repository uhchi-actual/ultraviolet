"use client";

import Link from "next/link";
import { useState } from "react";

import { analyzeTrack, searchTracks } from "@/lib/api";
import type { AnalyzeResponse, SearchResult } from "@/lib/types";

import { AnalysisResult } from "./AnalysisResult";
import { UploadZone } from "./UploadZone";

const LAST_SEED_KEY = "ultraviolet_last_seed";

function DriverBreakdown({ grade }: { grade: SearchResult["ultraviolet_grade"] }) {
  if (!grade) return null;
  return (
    <div className="mt-2 rounded-lg border border-uv-border bg-uv-bg-base/60 p-3 text-xs">
      <p className="font-medium text-uv-text-primary">
        Ultraviolet Grade: {(grade.score * 100).toFixed(0)}% · confidence {grade.confidence} ·{" "}
        {grade.agreement}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2 text-uv-text-secondary">
        <span>CLAP {grade.drivers.clap}</span>
        <span>Stem {grade.drivers.stem}</span>
        <span>Spectral {grade.drivers.spectral}</span>
        <span>Graph {grade.drivers.graph}</span>
      </div>
    </div>
  );
}

export function AnalyzePanel() {
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setSearchResults([]);
    setFileName(file.name);
    try {
      const data = await analyzeTrack(file);
      setResult(data);
      localStorage.setItem(LAST_SEED_KEY, data.track_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSearchResults([]);
    try {
      const ref = localStorage.getItem(LAST_SEED_KEY) ?? undefined;
      const data = await searchTracks(query.trim(), ref);
      setSearchResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
        <h2 className="text-lg font-semibold text-uv-text-primary">Search FMA Catalog</h2>
        <p className="mt-2 text-sm text-uv-text-secondary">
          Type <code className="text-uv-text-primary">Artist - Title</code> to search 8,000 real
          tracks from the Free Music Archive. Multi-driver scores appear when you have a seed track.
        </p>
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder="The Cure - A Forest"
            className="flex-1 rounded-lg border border-uv-border bg-uv-bg-base px-3 py-2 text-sm text-uv-text-primary placeholder:text-uv-text-muted focus:border-uv-purple-bright focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-uv-purple-bright px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Search
          </button>
        </form>
      </section>

      {searchResults.length > 0 ? (
        <ul className="space-y-3">
          {searchResults.map((hit) => (
            <li
              key={hit.track_id}
              className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-4"
            >
              <p className="font-medium text-uv-text-primary">
                {hit.title}{" "}
                <span className="text-uv-text-secondary">— {hit.artist}</span>
              </p>
              {hit.genre_top ? (
                <p className="text-xs text-uv-text-muted">{hit.genre_top}</p>
              ) : null}
              <DriverBreakdown grade={hit.ultraviolet_grade} />
            </li>
          ))}
        </ul>
      ) : null}

      <UploadZone onFile={handleFile} disabled={loading} />

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5 text-sm text-uv-text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-uv-border-strong border-t-uv-purple-bright" />
          {fileName ? (
            <>
              Processing <span className="text-uv-text-primary">{fileName}</span>…
            </>
          ) : (
            <>Searching catalog…</>
          )}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-uv-error/40 bg-uv-bg-surface/70 p-5 text-sm text-uv-error">
          {error}
        </div>
      ) : null}

      {result && !loading ? (
        <>
          <AnalysisResult data={result} />
          <p className="text-center text-sm text-uv-text-secondary">
            Seed saved with CLAP embedding.{" "}
            <Link href="/tree" className="text-uhchi-secondary underline-offset-4 hover:underline">
              Build Tree →
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
