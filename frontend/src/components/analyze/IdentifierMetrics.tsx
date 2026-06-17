import { ANALYZE_METRICS } from "@/lib/constants";
import type { IdentifierVector } from "@/lib/types";

export function IdentifierMetrics({ vector }: { vector: IdentifierVector }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ANALYZE_METRICS.map(({ key, label }) => {
        const raw = vector[key];
        const value = typeof raw === "number" ? Math.round(raw * 100) : "—";
        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-uv-border bg-uv-bg-elevated/50 px-4 py-3"
          >
            <span className="text-sm text-uv-text-secondary">{label}</span>
            <span className="font-mono text-sm font-medium text-uv-text-primary">{value}</span>
          </div>
        );
      })}
      <div className="flex items-center justify-between rounded-lg border border-uv-border bg-uv-bg-elevated/50 px-4 py-3">
        <span className="text-sm text-uv-text-secondary">Dynamic range</span>
        <span className="font-mono text-sm font-medium text-uv-text-primary">
          {vector.loudness_profile.dynamic_range} dB
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-uv-border bg-uv-bg-elevated/50 px-4 py-3">
        <span className="text-sm text-uv-text-secondary">Peak level</span>
        <span className="font-mono text-sm font-medium text-uv-text-primary">
          {vector.loudness_profile.peak_db} dB
        </span>
      </div>
    </div>
  );
}
