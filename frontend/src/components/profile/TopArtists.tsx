import type { TopArtist } from "@/lib/types";

export function TopArtists({ artists }: { artists: TopArtist[] }) {
  if (!artists.length) {
    return <p className="text-sm text-uv-text-muted">No artists yet.</p>;
  }
  const max = Math.max(...artists.map((a) => a.hours), 0.0001);

  return (
    <ol className="space-y-2.5">
      {artists.map((a, i) => (
        <li key={a.artist} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-right font-mono text-xs text-uv-text-muted">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-uv-text-primary">{a.artist}</span>
              <span className="shrink-0 font-mono text-xs text-uv-text-muted">
                {a.hours}h · {a.plays} plays
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-uv-bg-elevated">
              <div className="uv-gradient-bg h-full rounded-full" style={{ width: `${(a.hours / max) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
