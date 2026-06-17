import { HEATMAP_DAYS } from "@/lib/constants";

const COLS = "1.9rem repeat(24, minmax(0, 1fr))";

export function ListeningHeatmap({ heatmap }: { heatmap: number[][] }) {
  if (!heatmap.length) {
    return <p className="text-sm text-uv-text-muted">No listening data yet.</p>;
  }
  const max = Math.max(...heatmap.flat(), 0.0001);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[34rem] space-y-[3px]">
        <div className="grid items-end gap-[3px]" style={{ gridTemplateColumns: COLS }}>
          <span />
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} className="text-center font-mono text-[0.55rem] text-uv-text-muted">
              {h % 6 === 0 ? h : ""}
            </span>
          ))}
        </div>
        {heatmap.map((row, day) => (
          <div key={day} className="grid items-center gap-[3px]" style={{ gridTemplateColumns: COLS }}>
            <span className="font-mono text-[0.62rem] text-uv-text-muted">{HEATMAP_DAYS[day]}</span>
            {row.map((minutes, hour) => {
              const intensity = minutes / max;
              return (
                <div
                  key={hour}
                  title={`${HEATMAP_DAYS[day]} ${String(hour).padStart(2, "0")}:00 — ${minutes} min`}
                  className="aspect-square rounded-[2px]"
                  style={{
                    backgroundColor:
                      intensity <= 0
                        ? "var(--uv-bg-elevated)"
                        : `rgba(150, 26, 132, ${0.14 + intensity * 0.86})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-uv-text-muted">
        Minutes listened by weekday × hour — brighter is more active.
      </p>
    </div>
  );
}
