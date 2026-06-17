import type { GenreWeight } from "@/lib/types";

export function TopGenres({ genres }: { genres: GenreWeight[] }) {
  if (!genres.length) {
    return <p className="text-sm text-uv-text-muted">No genres inferred yet.</p>;
  }
  const max = Math.max(...genres.map((g) => g.weight), 0.0001);

  return (
    <div className="space-y-3">
      {genres.map((g) => (
        <div key={g.genre}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-sm capitalize text-uv-text-primary">{g.genre}</span>
            <span className="shrink-0 font-mono text-xs text-uv-text-muted">
              {Math.round(g.weight * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-uv-bg-elevated">
            <div
              className="uv-gradient-bg h-full rounded-full"
              style={{ width: `${(g.weight / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
