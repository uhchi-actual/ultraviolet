import { STEM_LABELS } from "@/lib/constants";
import type { StemProfile } from "@/lib/types";

export function StemBar({ profile }: { profile: StemProfile }) {
  const rows = (Object.entries(profile) as [keyof StemProfile, number][])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (!rows.length) {
    return <p className="text-sm text-uv-text-muted">No stem data.</p>;
  }

  return (
    <div className="space-y-2.5">
      <p className="mb-3 text-sm text-uv-text-secondary">
        Real stem energy from Demucs source separation — each bar is that stem&apos;s share of
        total RMS energy.
      </p>
      {rows.map(([key, pct]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm text-uv-text-secondary">
            {STEM_LABELS[key]}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-uv-bg-elevated">
            <div
              className="uv-gradient-bg h-full rounded-full"
              style={{ width: `${Math.max(pct, 1)}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-xs text-uv-text-primary">
            {Math.round(pct)}%
          </span>
        </div>
      ))}
    </div>
  );
}
