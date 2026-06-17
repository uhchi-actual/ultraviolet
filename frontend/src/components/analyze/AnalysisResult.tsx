import type { ReactNode } from "react";

import { KEY_NAMES } from "@/lib/constants";
import type { AnalyzeResponse } from "@/lib/types";

import { DjIdentifierRadar } from "@/components/radar/DjIdentifierRadar";
import { EmotionalArcChart } from "./EmotionalArcChart";
import { IdentifierGrid } from "./IdentifierGrid";
import { StemStackedBar } from "./StemStackedBar";
import { WaveformDisplay } from "./WaveformDisplay";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
      <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-uv-text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-1.5">
      <span className="font-mono text-[0.62rem] uppercase tracking-wider text-uv-text-muted">
        {label}
      </span>
      <p className="font-display text-sm font-semibold text-uv-text-primary">{value}</p>
    </div>
  );
}

export function AnalysisResult({ data }: { data: AnalyzeResponse }) {
  const v = data.identifiers;
  const sp = v.stem_presence;
  const keyLabel = `${KEY_NAMES[v.key] ?? "?"} ${v.mode === 1 ? "major" : "minor"}`;
  const showArc = v.emotional_arc.values.length > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold text-uv-text-primary">{data.title}</h2>
            <p className="text-sm text-uv-text-secondary">{data.artist ?? "Unknown artist"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip label="Tempo" value={`${Math.round(v.tempo)} BPM`} />
            <Chip label="Key" value={keyLabel} />
            <Chip label="Vocals stem" value={`${Math.round(sp.vocals_pct)}%`} />
            <Chip label="Instrumental" value={`${Math.round(v.instrumentalness * 100)}%`} />
          </div>
        </div>
        <div className="mt-4">
          <WaveformDisplay data={data.waveform_data} />
        </div>
      </div>

      <Panel title="Stem breakdown">
        <StemStackedBar presence={sp} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Reliable identifiers">
          <IdentifierGrid vector={v} />
        </Panel>
        <Panel title="Fingerprint (11 axes)">
          <DjIdentifierRadar vector={v} />
        </Panel>
      </div>

      <Panel title="Emotional arc">
        {showArc ? (
          <>
            <EmotionalArcChart arc={v.emotional_arc.values} />
            <p className="mt-3 text-sm text-uv-text-secondary">
              Intensity across four quarters — shown only when variation exceeds 15%.
            </p>
          </>
        ) : (
          <p className="font-display text-base text-uv-text-primary">{v.emotional_arc.label}</p>
        )}
      </Panel>

      <p className="text-center font-mono text-xs text-uv-text-muted">
        Demucs {v.stem_presence.vocals_pct < 5 ? "· instrumental detected" : ""} · librosa on isolated stems
      </p>
    </div>
  );
}
