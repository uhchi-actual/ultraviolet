import { KEY_NAMES } from "@/lib/constants";
import { describeIdentifier } from "@/lib/analyzeDescriptions";
import type { IdentifierVector } from "@/lib/types";

const ROWS: { key: string; label: string; format: (v: IdentifierVector) => string }[] = [
  { key: "tempo", label: "Tempo", format: (v) => `${Math.round(v.tempo)} BPM` },
  {
    key: "key",
    label: "Key",
    format: (v) => `${KEY_NAMES[v.key] ?? "?"} ${v.mode === 1 ? "major" : "minor"}`,
  },
  { key: "energy", label: "Energy", format: (v) => `${Math.round(v.energy * 100)}` },
  { key: "danceability", label: "Groove", format: (v) => `${Math.round(v.danceability * 100)}` },
  {
    key: "instrumentalness",
    label: "Instrumental",
    format: (v) => `${Math.round(v.instrumentalness * 100)}`,
  },
  { key: "texture_density", label: "Density", format: (v) => `${Math.round(v.texture_density * 100)}` },
  {
    key: "rhythmic_complexity",
    label: "Rhythm",
    format: (v) => `${Math.round(v.rhythmic_complexity * 100)}`,
  },
  {
    key: "harmonic_darkness",
    label: "Darkness",
    format: (v) => `${Math.round(v.harmonic_darkness * 100)}`,
  },
  {
    key: "loudness",
    label: "Dynamic range",
    format: (v) => `${v.loudness_profile.dynamic_range} dB`,
  },
];

function barValue(key: string, v: IdentifierVector): number {
  if (key === "tempo") return Math.min(v.tempo / 200, 1);
  if (key === "key" || key === "loudness") return 0.5;
  const map: Record<string, number> = {
    energy: v.energy,
    danceability: v.danceability,
    instrumentalness: v.instrumentalness,
    texture_density: v.texture_density,
    rhythmic_complexity: v.rhythmic_complexity,
    harmonic_darkness: v.harmonic_darkness,
  };
  return map[key] ?? 0;
}

export function IdentifierGrid({ vector }: { vector: IdentifierVector }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ROWS.map(({ key, label, format }) => (
        <div key={key} className="rounded-lg border border-uv-border bg-uv-bg-elevated/40 p-4">
          <p className="font-mono text-xs uppercase tracking-wider text-uv-text-muted">{label}</p>
          <p className="font-display text-2xl font-semibold text-uv-text-primary">{format(vector)}</p>
          {key !== "loudness" && key !== "key" ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-uv-bg-primary">
              <div className="uv-gradient-bg h-full rounded-full" style={{ width: `${barValue(key, vector) * 100}%` }} />
            </div>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-uv-text-secondary">
            {describeIdentifier(key, vector)}
          </p>
        </div>
      ))}
    </div>
  );
}
