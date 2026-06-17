"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { TASTE_AXES, UV_GRADIENT_STOPS } from "@/lib/constants";

export function TasteRadar({ taste }: { taste: Record<string, number> }) {
  const data = TASTE_AXES.map((axis) => ({
    axis: axis.label,
    value: Math.round((taste[axis.key] ?? 0) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="70%">
        <defs>
          <linearGradient id="uv-taste-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={UV_GRADIENT_STOPS[0]} />
            <stop offset="55%" stopColor={UV_GRADIENT_STOPS[1]} />
            <stop offset="100%" stopColor={UV_GRADIENT_STOPS[2]} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="var(--uv-border)" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--uv-text-secondary)", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke="url(#uv-taste-fill)"
          strokeWidth={2}
          fill="url(#uv-taste-fill)"
          fillOpacity={0.35}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
