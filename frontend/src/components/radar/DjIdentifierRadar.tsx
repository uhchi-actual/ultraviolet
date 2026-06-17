"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { DJ_RADAR_AXES, UV_GRADIENT_STOPS } from "@/lib/constants";
import type { IdentifierVector } from "@/lib/types";

function readValue(vector: IdentifierVector, key: string): number {
  if (key.startsWith("stem_presence.")) {
    const k = key.split(".")[1] as keyof IdentifierVector["stem_presence"];
    return vector.stem_presence[k] ?? 0;
  }
  return (vector as unknown as Record<string, number>)[key] ?? 0;
}

export function DjIdentifierRadar({ vector }: { vector: IdentifierVector }) {
  const data = DJ_RADAR_AXES.map((axis) => {
    const raw = readValue(vector, axis.key);
    const scale = axis.scale ?? 1;
    const value = scale <= 1 ? Math.round(raw * 100) : Math.round((raw / scale) * 100);
    return { axis: axis.label, value: Math.min(value, 100) };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="70%">
        <defs>
          <linearGradient id="uv-dj-radar" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={UV_GRADIENT_STOPS[0]} />
            <stop offset="55%" stopColor={UV_GRADIENT_STOPS[1]} />
            <stop offset="100%" stopColor={UV_GRADIENT_STOPS[2]} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="var(--uv-border)" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--uv-text-secondary)", fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke="url(#uv-dj-radar)"
          strokeWidth={2}
          fill="url(#uv-dj-radar)"
          fillOpacity={0.35}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
