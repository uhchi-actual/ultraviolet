"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { RADAR_AXES, UV_GRADIENT_STOPS } from "@/lib/constants";
import type { IdentifierVector } from "@/lib/types";

interface IdentifierRadarProps {
  vector: IdentifierVector;
}

export function IdentifierRadar({ vector }: IdentifierRadarProps) {
  const data = RADAR_AXES.map((axis) => ({
    axis: axis.label,
    value: Math.round(((vector as unknown as Record<string, number>)[axis.key] ?? 0) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="72%">
        <defs>
          <linearGradient id="uv-radar-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={UV_GRADIENT_STOPS[0]} />
            <stop offset="55%" stopColor={UV_GRADIENT_STOPS[1]} />
            <stop offset="100%" stopColor={UV_GRADIENT_STOPS[2]} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="var(--uv-border)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--uv-text-secondary)", fontSize: 11 }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke="url(#uv-radar-fill)"
          strokeWidth={2}
          fill="url(#uv-radar-fill)"
          fillOpacity={0.35}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
