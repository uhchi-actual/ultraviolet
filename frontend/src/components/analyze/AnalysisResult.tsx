import type { ReactNode } from "react";

import { KEY_NAMES, RADAR_AXES } from "@/lib/constants";
import type { AnalyzeResponse } from "@/lib/types";

import { IdentifierRadar } from "@/components/radar/IdentifierRadar";
import { EmotionalArcChart } from "./EmotionalArcChart";
import { InstrumentBar } from "./InstrumentBar";
import { WaveformDisplay } from "./WaveformDisplay";

const ARC_LABELS = ["Quiet", "Building", "Moderate", "Intense"];

function pct(value: number): number {
  return Math.round(value * 100);
}

function arcDescription(arc: number[]): string {
  if (arc.length < 2) return "—";
  const delta = arc[arc.length - 1] - arc[0];
  if (delta > 0.2) return "Slow build — rises toward the end";
  if (delta < -0.2) return "Front-loaded — opens intense, then settles";
  const peak = Math.max(...arc);
  if (peak - Math.min(...arc) > 0.2 && arc.indexOf(peak) > 0 && arc.indexOf(peak) < arc.length - 1)
    return "Peaks in the middle";
  return "Fairly flat — consistent intensity";
}

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
      <span className="font-mono text-[0.65rem] uppercase tracking-wider text-uv-text-muted">
        {label}
      </span>
      <p className="font-display text-sm font-semibold text-uv-text-primary">{value}</p>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-uv-text-secondary">{label}</span>
        <span className="font-mono text-xs text-uv-text-muted">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-uv-bg-elevated">
        <div className="uv-gradient-bg h-full rounded-full" style={{ width: `${Math.max(value, 1)}%` }} />
      </div>
    </div>
  );
}

export function AnalysisResult({ data }: { data: AnalyzeResponse }) {
  const v = data.identifiers;
  const scalars = v as unknown as Record<string, number>;
  const keyName = KEY_NAMES[v.key] ?? "?";
  const modeName = v.mode === 1 ? "major" : "minor";

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-uv-text-primary">{data.title}</h2>
            <p className="text-sm text-uv-text-secondary">{data.artist ?? "Unknown artist"}</p>
            <p className="mt-1 font-mono text-[0.7rem] text-uv-text-muted">{data.track_id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip label="Tempo" value={`${Math.round(v.tempo)} BPM`} />
            <Chip label="Key" value={`${keyName} ${modeName}`} />
            <Chip label="Valence" value={`${pct(v.valence)}`} />
            <Chip label="Energy" value={`${pct(v.energy)}`} />
          </div>
        </div>
        <div className="mt-4">
          <WaveformDisplay data={data.waveform_data} />
        </div>
      </div>

      {/* Radar + arc */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Identifier radar">
          <IdentifierRadar vector={v} />
        </Panel>
        <Panel title="Emotional arc">
          <EmotionalArcChart arc={v.emotional_arc} />
          <p className="mt-3 text-sm text-uv-text-secondary">{arcDescription(v.emotional_arc)}</p>
          <div className="mt-2 flex justify-between font-mono text-[0.65rem] text-uv-text-muted">
            {v.emotional_arc.map((value, i) => (
              <span key={i}>
                {ARC_LABELS[i] ?? `Q${i + 1}`}: {pct(value)}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      {/* Instrumentation */}
      <Panel title="Instrumentation profile">
        <InstrumentBar profile={v.instrumentation_profile} />
      </Panel>

      {/* Scalar breakdown */}
      <Panel title="The 15 identifiers">
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {RADAR_AXES.map((axis) => (
            <StatBar key={axis.key} label={axis.label} value={pct(scalars[axis.key] ?? 0)} />
          ))}
        </div>
      </Panel>

      {/* Signal detail */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Loudness profile">
          <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
            <Detail term="Peak" value={`${v.loudness_profile.peak_db} dB`} />
            <Detail term="RMS" value={`${v.loudness_profile.rms_db} dB`} />
            <Detail term="Dynamic range" value={`${v.loudness_profile.dynamic_range} dB`} />
            <Detail term="Crest factor" value={`${v.loudness_profile.crest_factor}`} />
          </dl>
        </Panel>
        <Panel title="Vocal character">
          {v.vocal_character ? (
            <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
              <Detail
                term="Pitch range"
                value={`${v.vocal_character.pitch_range_low_hz}–${v.vocal_character.pitch_range_high_hz} Hz`}
              />
              <Detail term="Median pitch" value={`${v.vocal_character.pitch_median_hz} Hz`} />
              <Detail term="Brightness" value={`${pct(v.vocal_character.timbre_brightness ?? 0)}`} />
              <Detail term="Roughness" value={`${pct(v.vocal_character.roughness ?? 0)}`} />
              <Detail term="Breathiness" value={`${pct(v.vocal_character.breathiness ?? 0)}`} />
            </dl>
          ) : (
            <p className="text-sm text-uv-text-secondary">
              Instrumental — instrumentalness {pct(v.instrumentalness)} (vocal analysis skipped).
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[0.65rem] uppercase tracking-wider text-uv-text-muted">{term}</dt>
      <dd className="uv-gradient-text font-semibold">{value}</dd>
    </div>
  );
}
