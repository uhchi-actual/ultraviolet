import { GlowCard } from "./GlowCard";
import { PhaseBadge } from "./PhaseBadge";

interface ComingSoonProps {
  phase: number;
  points: string[];
}

export function ComingSoon({ phase, points }: ComingSoonProps) {
  return (
    <GlowCard className="max-w-2xl">
      <PhaseBadge phase={phase} />
      <p className="mt-4 text-sm text-uv-text-secondary">
        This view is stubbed in the Phase 1 foundation. It will include:
      </p>
      <ul className="mt-3 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5 text-sm text-uv-text-secondary">
            <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-uhchi-secondary" />
            {point}
          </li>
        ))}
      </ul>
    </GlowCard>
  );
}
