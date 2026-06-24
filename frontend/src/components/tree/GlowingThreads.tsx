"use client";

import { motion } from "framer-motion";

import { motifForGenre } from "@/lib/genreMotifs";
import type { TreeEdge, TreeNode } from "@/lib/types";

import { constellationPath, nodeAnchor, type LayoutPos } from "./organicLayout";

export function GlowingThreads({
  edges,
  positions,
  nodesById,
}: {
  edges: TreeEdge[];
  positions: Map<string, LayoutPos>;
  nodesById: Map<string, TreeNode>;
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
        const motif = motifForGenre(toN.genre_bucket || fromN.genre_bucket);
        const opacity = 0.28 + (e.weight ?? 0.5) * 0.42;
        const pulseDuration = 3.2 + (i % 5) * 0.45;
        const gradId = `threadGrad-${i}`;

        return (
          <g key={edgeKey}>
            <defs>
              <linearGradient
                id={gradId}
                gradientUnits="userSpaceOnUse"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              >
                <stop offset="0%" stopColor={motif.primary} stopOpacity="0.1" />
                <stop offset="48%" stopColor={motif.secondary} stopOpacity="0.92" />
                <stop offset="100%" stopColor={motif.primary} stopOpacity="0.22" />
              </linearGradient>
            </defs>
            <motion.path
              d={d}
              fill="none"
              stroke={motif.primary}
              strokeWidth={6}
              strokeLinecap="round"
              filter="url(#threadGlow)"
              animate={{ strokeOpacity: [opacity * 0.08, opacity * 0.24, opacity * 0.08] }}
              transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
            />
            <path
              d={d}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={1.35}
              strokeLinecap="round"
              strokeOpacity={opacity * 0.78}
            />
            <motion.path
              d={d}
              fill="none"
              stroke={motif.secondary}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeDasharray="3 132"
              strokeOpacity={0.62}
              animate={{ strokeDashoffset: [0, -135] }}
              transition={{
                duration: 5.2 + (i % 7) * 0.5,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.12,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
