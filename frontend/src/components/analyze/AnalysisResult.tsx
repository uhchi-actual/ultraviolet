import type { ReactNode } from "react";

import { summarize } from "@/lib/insights";
import type { Insight, InsightTone } from "@/lib/insights";
import type { AnalyzeResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

import { IdentifierRadar } from "@/components/radar/IdentifierRadar";
import { EmotionalArcChart } from "./EmotionalArcChart";
import { InstrumentBar } from "./InstrumentBar";
import { WaveformDisplay } from "./WaveformDisplay";

const TONE_DOT: Record<InsightTone, string> = {
  accent: "uv-gradient-bg",
  positive: "bg-uv-success",
  warning: "bg-uv-warning",
};

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

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="flex gap-3 rounded-lg border border-uv-border bg-uv-bg-elevated/40 p-4">
      <span className={cn("mt-[0.4rem] h-2 w-2 shrink-0 rounded-full", TONE_DOT[insight.tone])} />
      <div>
        <p className="font-display text-sm font-semibold text-uv-text-primary">{insight.label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-uv-text-secondary">{insight.detail}</p>
      </div>
    </div>
  );
}

export function AnalysisResult({ data }: { data: AnalyzeResponse }) {
  const v = data.identifiers;
  const summary = summarize(v);

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold text-uv-text-primary">{data.title}</h2>
            <p className="text-sm text-uv-text-secondary">{data.artist ?? "Unknown artist"}</p>
            <p className="uv-gradient-text mt-2 font-display text-lg font-medium capitalize">
              {summary.headline}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip label="Tempo" value={`${Math.round(v.tempo)} BPM`} />
            <Chip label="Key" value={summary.keyLabel} />
            <Chip label="Mood" value={summary.mood} />
            <Chip label="Energy" value={summary.energyLabel} />
          </div>
        </div>
        <div className="mt-4">
          <WaveformDisplay data={data.waveform_data} />
        </div>
      </div>

      {/* The conclusions — the part a listener actually reads */}
      <Panel title="What stands out">
        {summary.insights.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.insights.map((insight) => (
              <InsightCard key={insight.label} insight={insight} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-uv-text-secondary">
            A balanced track — nothing sits at an extreme on any axis.
          </p>
        )}
      </Panel>

      {/* Fingerprint visuals */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Sonic fingerprint">
          <IdentifierRadar vector={v} />
        </Panel>
        <Panel title="Emotional arc">
          <EmotionalArcChart arc={v.emotional_arc} />
          <p className="mt-3 text-sm text-uv-text-secondary">
            How intensity moves across the four quarters of the track.
          </p>
        </Panel>
      </div>

      <Panel title="What's playing">
        <InstrumentBar profile={v.instrumentation_profile} />
      </Panel>

      {/* Demoted raw signal detail for the curious */}
      <p className="text-center font-mono text-xs text-uv-text-muted">
        under the hood · {Math.round(v.tempo)} BPM · {summary.keyLabel} · dynamic range{" "}
        {v.loudness_profile.dynamic_range} dB · peak {v.loudness_profile.peak_db} dB
      </p>
    </div>
  );
}
