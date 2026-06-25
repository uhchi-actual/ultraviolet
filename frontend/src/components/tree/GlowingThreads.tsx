"use client";

import { motifForGenre } from "@/lib/genreMotifs";
import type { TreeEdge, TreeNode } from "@/lib/types";

import { constellationPath, nodeAnchor, nodeAnchorToward, type LayoutPos } from "./organicLayout";

type RenderEdgeKind = NonNullable<TreeEdge["kind"]> | "branch";

function isCrossLink(kind: RenderEdgeKind): boolean {
  return kind === "seed_bridge" || kind === "bridge" || kind === "mesh";
}

function edgeStyle(kind: RenderEdgeKind, weight = 0.5) {
  if (kind === "seed_bridge") {
    return {
      width: 1.35,
      opacity: 0.18 + weight * 0.18,
    };
  }
  if (kind === "bridge") {
    return {
      width: 1.1,
      opacity: 0.16 + weight * 0.16,
    };
  }
  return {
    width: 1.2,
    opacity: 0.22 + weight * 0.22,
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
      {edges.map((e) => {
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
        const stroke = edgeKind === "seed_bridge" ? motif.secondary : motif.primary;

        return (
          <g key={edgeKey} data-edge-kind={edgeKind}>
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={style.width}
              strokeLinecap="round"
              strokeOpacity={style.opacity}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}
