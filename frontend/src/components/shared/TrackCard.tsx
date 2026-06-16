import { cn } from "@/lib/utils";

interface TrackCardProps {
  title: string;
  artist: string;
  confidence?: number;
  className?: string;
}

/** Reusable track display card (PRD §8.2 recommendation cards build on this). */
export function TrackCard({ title, artist, confidence, className }: TrackCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-uv-indigo-mid bg-uv-bg-surface p-4",
        className,
      )}
    >
      <div>
        <p className="font-display text-uv-text-primary">{title}</p>
        <p className="text-sm text-uv-text-secondary">{artist}</p>
      </div>
      {typeof confidence === "number" ? (
        <span className="font-mono text-sm text-uhchi-primary">
          {Math.round(confidence * 100)}%
        </span>
      ) : null}
    </div>
  );
}
