"use client";

import { motion } from "framer-motion";

import type { TreeEdge } from "@/lib/types";

import { constellationPath, nodeAnchor, type LayoutPos } from "./organicLayout";

type NodeMeta = { id: string; type: string };

export function GlowingThreads({
  edges,
  positions,
  nodesById,
}: {
  edges: TreeEdge[];
  positions: Map<string, LayoutPos>;
  nodesById: Map<string, NodeMeta>;
}) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <defs>
        <filter id="threadGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="threadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#e9d5ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {edges.map((e, i) => {
        const fromN = nodesById.get(e.source);
        const toN = nodesById.get(e.target);
        const fromP = positions.get(e.source);
        const toP = positions.get(e.target);
        if (!fromN || !toN || !fromP || !toP) return null;

        const from = nodeAnchor(fromP, fromN.type, "bottom");
        const to = nodeAnchor(toP, toN.type, "top");
        const edgeKey = `${e.source}-${e.target}-${e.kind}`;
        const d = constellationPath(from, to, edgeKey);
        const opacity = 0.4 + (e.weight ?? 0.5) * 0.45;
        const pulseDuration = 2.8 + (i % 5) * 0.35;

        return (
          <g key={edgeKey}>
            {/* Soft halo — breathes in opacity only */}
            <motion.path
              d={d}
              fill="none"
              stroke="#a855f7"
              strokeWidth={8}
              strokeLinecap="round"
              filter="url(#threadGlow)"
              animate={{ strokeOpacity: [opacity * 0.15, opacity * 0.35, opacity * 0.15] }}
              transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Solid core filament */}
            <path
              d={d}
              fill="none"
              stroke="url(#threadGrad)"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeOpacity={opacity * 0.85}
            />
            {/* Energy pulse traveling along fixed path */}
            <motion.path
              d={d}
              fill="none"
              stroke="#f3e8ff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="4 120"
              strokeOpacity={0.7}
              animate={{ strokeDashoffset: [0, -124] }}
              transition={{
                duration: 4 + (i % 7) * 0.4,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.15,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
