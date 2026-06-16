"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { UV_GRADIENT_STOPS } from "@/lib/constants";

interface EmotionalArcChartProps {
  arc: number[];
}

export function EmotionalArcChart({ arc }: EmotionalArcChartProps) {
  const data = arc.map((value, index) => ({
    quarter: `Q${index + 1}`,
    intensity: Math.round(value * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="uv-arc-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={UV_GRADIENT_STOPS[0]} />
            <stop offset="55%" stopColor={UV_GRADIENT_STOPS[1]} />
            <stop offset="100%" stopColor={UV_GRADIENT_STOPS[2]} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--uv-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="quarter"
          tick={{ fill: "var(--uv-text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--uv-border)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--uv-text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Line
          type="monotone"
          dataKey="intensity"
          stroke="url(#uv-arc-line)"
          strokeWidth={3}
          dot={{ r: 4, fill: UV_GRADIENT_STOPS[1], strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
