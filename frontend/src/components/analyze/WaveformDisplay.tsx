interface WaveformDisplayProps {
  data: number[];
}

/** Renders the downsampled waveform as peak bars, with quarter markers that
 *  line up with the 4-point emotional arc. */
export function WaveformDisplay({ data }: WaveformDisplayProps) {
  if (data.length === 0) return null;

  return (
    <div className="relative flex h-24 items-center gap-px overflow-hidden rounded-lg border border-uv-border bg-uv-bg-surface/60 px-2">
      {[25, 50, 75].map((left) => (
        <span
          key={left}
          className="pointer-events-none absolute inset-y-0 w-px bg-uv-border-strong/70"
          style={{ left: `${left}%` }}
        />
      ))}
      {data.map((value, index) => (
        <div
          key={index}
          className="uv-gradient-bg min-h-[2px] flex-1 rounded-full opacity-80"
          style={{ height: `${Math.max(value * 100, 2)}%` }}
        />
      ))}
    </div>
  );
}
