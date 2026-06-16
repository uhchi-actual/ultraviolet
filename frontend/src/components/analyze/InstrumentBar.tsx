import { INSTRUMENT_LABELS } from "@/lib/constants";

interface InstrumentBarProps {
  profile: Record<string, number>;
}

export function InstrumentBar({ profile }: InstrumentBarProps) {
  const rows = Object.entries(profile).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2.5">
      {rows.map(([key, value]) => {
        const pct = Math.round(value * 100);
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-sm text-uv-text-secondary">
              {INSTRUMENT_LABELS[key] ?? key}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-uv-bg-elevated">
              <div
                className="uv-gradient-bg h-full rounded-full"
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right font-mono text-xs text-uv-text-muted">
              {pct}
            </span>
          </div>
        );
      })}
    </div>
  );
}
