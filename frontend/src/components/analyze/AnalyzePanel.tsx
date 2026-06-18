"use client";

import Link from "next/link";
import { useState } from "react";

import { analyzeTrack } from "@/lib/api";
import type { AnalyzeResponse } from "@/lib/types";

import { AnalysisResult } from "./AnalysisResult";
import { BatchImportPanel } from "./BatchImportPanel";
import { ListenCapture } from "./ListenCapture";
import { UploadZone } from "./UploadZone";

const LAST_SEED_KEY = "ultraviolet_last_seed";

export function AnalyzePanel() {
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
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

  return (
    <div className="space-y-5">
      <UploadZone onFile={handleFile} disabled={loading} />

      <BatchImportPanel />

      <ListenCapture
        disabled={loading}
        onAnalyzing={() => {
          setLoading(true);
          setFileName("Captured audio");
        }}
        onResult={(data) => {
          setLoading(false);
          setResult(data);
          setError(null);
          localStorage.setItem(LAST_SEED_KEY, data.track_id);
        }}
        onError={(msg) => {
          setLoading(false);
          setError(msg);
          setResult(null);
        }}
      />

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5 text-sm text-uv-text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-uv-border-strong border-t-uv-purple-bright" />
          Separating stems with Demucs and measuring <span className="text-uv-text-primary">{fileName}</span>… this can take a minute on GPU.
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
            Analysis saved.{" "}
            <Link href="/radio" className="text-uhchi-secondary underline-offset-4 hover:underline">
              Use as Radio seed
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
