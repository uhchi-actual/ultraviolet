"use client";

import { motion } from "framer-motion";

import { motifForGenre } from "@/lib/genreMotifs";
import type { TreeEdge, TreeNode } from "@/lib/types";

import { constellationPath, nodeAnchor, nodeAnchorToward, type LayoutPos } from "./organicLayout";

type RenderEdgeKind = NonNullable<TreeEdge["kind"]> | "branch";

function isCrossLink(kind: RenderEdgeKind): boolean {
  return kind === "seed_bridge" || kind === "bridge" || kind === "mesh";
}

function edgeStyle(kind: RenderEdgeKind, weight = 0.5) {
  if (kind === "mesh") {
    return {
      glowWidth: 3.4,
      coreWidth: 0.82,
      dashWidth: 1.05,
      opacity: 0.11 + weight * 0.24,
      dashArray: "2 118",
    };
  }
  if (kind === "seed_bridge") {
    return {
      glowWidth: 5.4,
      coreWidth: 1.28,
      dashWidth: 1.55,
      opacity: 0.2 + weight * 0.36,
      dashArray: "4 156",
    };
  }
  if (kind === "bridge") {
    return {
      glowWidth: 4.6,
      coreWidth: 1.05,
      dashWidth: 1.35,
      opacity: 0.16 + weight * 0.3,
      dashArray: "3 136",
    };
  }
  return {
    glowWidth: 6,
    coreWidth: 1.35,
    dashWidth: 1.8,
    opacity: 0.28 + weight * 0.42,
    dashArray: "3 132",
  };
}

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
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" data-testid="tree-threads">
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

        const edgeKind: RenderEdgeKind = e.kind ?? "branch";
        const from = isCrossLink(edgeKind)
          ? nodeAnchorToward(fromP, fromN.type, toP)
          : nodeAnchor(fromP, fromN.type, "bottom");
        const to = isCrossLink(edgeKind)
          ? nodeAnchorToward(toP, toN.type, fromP)
          : nodeAnchor(toP, toN.type, "top");
        const edgeKey = `${e.source}-${e.target}-${edgeKind}`;
        const d = constellationPath(from, to, edgeKey);
        const motif = motifForGenre(toN.genre_bucket || fromN.genre_bucket);
        const style = edgeStyle(edgeKind, e.weight);
        const pulseDuration = 3.2 + (i % 5) * 0.45;
        const breatheDuration = edgeKind === "mesh" ? 6.4 + (i % 7) * 0.32 : 4.8 + (i % 5) * 0.34;
        const sparkTravel = edgeKind === "mesh" ? -120 : edgeKind === "seed_bridge" ? -160 : -136;
        const gradId = `threadGrad-${i}`;

        return (
          <g key={edgeKey} data-edge-kind={edgeKind}>
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
              strokeWidth={style.glowWidth}
              strokeLinecap="round"
              filter="url(#threadGlow)"
              animate={{ strokeOpacity: [style.opacity * 0.08, style.opacity * 0.28, style.opacity * 0.08] }}
              transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d={d}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={style.coreWidth}
              strokeLinecap="round"
              animate={{
                strokeOpacity: [style.opacity * 0.46, style.opacity * 0.9, style.opacity * 0.52],
                strokeWidth: [style.coreWidth * 0.78, style.coreWidth * 1.22, style.coreWidth * 0.9],
              }}
              transition={{
                duration: breatheDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: (i % 11) * 0.14,
              }}
            />
            <motion.path
              d={d}
              fill="none"
              stroke={motif.secondary}
              strokeWidth={style.dashWidth}
              strokeLinecap="round"
              strokeDasharray={style.dashArray}
              strokeOpacity={edgeKind === "mesh" ? 0.32 : 0.58}
              animate={{ strokeDashoffset: [0, sparkTravel] }}
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
