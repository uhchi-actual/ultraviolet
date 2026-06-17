import type { StemPresence } from "@/lib/types";
import { STEM_SEGMENTS } from "@/lib/constants";

export function StemStackedBar({ presence }: { presence: StemPresence }) {
  const total = STEM_SEGMENTS.reduce((s, seg) => s + presence[seg.key], 0) || 1;

  return (
    <div>
      <p className="mb-3 text-sm text-uv-text-secondary">
        Real Demucs separation — each segment is that stem&apos;s share of total RMS energy.
      </p>
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-uv-border">
        {STEM_SEGMENTS.map((seg) => {
          const pct = presence[seg.key];
          if (pct <= 0) return null;
          const width = (pct / total) * 100;
          return (
            <div
              key={seg.key}
              title={`${seg.label}: ${Math.round(pct)}%`}
              className="flex items-center justify-center text-[0.65rem] font-mono font-medium text-white/90"
              style={{ width: `${width}%`, backgroundColor: seg.color, minWidth: pct > 3 ? undefined : "2px" }}
            >
              {width > 12 ? `${Math.round(pct)}%` : ""}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {STEM_SEGMENTS.map((seg) => (
          <span key={seg.key} className="flex items-center gap-2 text-xs text-uv-text-secondary">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            {seg.label} {Math.round(presence[seg.key])}%
          </span>
        ))}
      </div>
    </div>
  );
}
