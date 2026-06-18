import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";

import type { TreeEdge, TreeGraph, TreeNode } from "@/lib/types";

export type LayoutPos = { x: number; y: number };

/** Seeded PRNG — same seed yields same filament structure, different seed = new cosmos. */
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type TreeSimNode = TreeNode & { x: number; y: number };

function buildChildrenMap(edges: TreeEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const list = map.get(e.source) ?? [];
    list.push(e.target);
    map.set(e.source, list);
  }
  return map;
}

/** Radial filament placement — Laniakea-style emergent structure from seeds outward. */
export function computeOrganicLayout(
  graph: TreeGraph,
  width: number,
  height: number,
  layoutSeed?: number,
): Map<string, LayoutPos> {
  const seed =
    layoutSeed ??
    hashSeed(graph.nodes.map((n) => n.id).join("|") + graph.edges.length);
  const rand = mulberry32(seed);

  const cx = width * 0.5;
  const cy = height * 0.38;
  const seeds = graph.nodes.filter((n) => n.type === "seed");
  const childrenOf = buildChildrenMap(graph.edges);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const positions = new Map<string, LayoutPos>();

  // Seed supercluster — tight nucleus with slight scatter
  const seedSpread = Math.min(280, width / (seeds.length + 2));
  seeds.forEach((seedNode, i) => {
    const angle = (i / Math.max(1, seeds.length)) * Math.PI * 2 + rand() * 0.4;
    const r = seedSpread * (0.35 + rand() * 0.25);
    positions.set(seedNode.id, {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r * 0.35,
    });
  });

  const visited = new Set<string>(seeds.map((s) => s.id));

  function placeFilament(parentId: string, depth: number) {
    const kids = childrenOf.get(parentId) ?? [];
    const parent = positions.get(parentId);
    if (!parent || !kids.length) return;

    const baseAngle = Math.atan2(parent.y - cy, parent.x - cx);
    const spread = Math.min(Math.PI * 0.85, 0.45 + kids.length * 0.12);
    const step = kids.length > 1 ? spread / (kids.length - 1) : 0;
    const armLen = 140 + depth * 95 + rand() * 60;

    kids.forEach((kidId, idx) => {
      if (visited.has(kidId)) return;
      visited.add(kidId);
      const offset = kids.length > 1 ? -spread / 2 + step * idx : rand() * 0.3 - 0.15;
      const angle = baseAngle + offset + (rand() - 0.5) * 0.22;
      const dist = armLen * (0.85 + rand() * 0.3);
      positions.set(kidId, {
        x: parent.x + Math.cos(angle) * dist,
        y: parent.y + Math.sin(angle) * dist + depth * 25,
      });
      placeFilament(kidId, depth + 1);
    });
  }

  for (const s of seeds) {
    placeFilament(s.id, 1);
  }

  // Orphans (disconnected) — outer halo
  for (const n of graph.nodes) {
    if (!positions.has(n.id)) {
      const a = rand() * Math.PI * 2;
      const r = width * 0.28 + rand() * width * 0.12;
      positions.set(n.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  }

  // Light collision pass — separate overlaps without destroying filament shape
  const simNodes: TreeSimNode[] = graph.nodes.map((n) => {
    const p = positions.get(n.id)!;
    return { ...n, x: p.x, y: p.y };
  });
  const simNodeById = new Map(simNodes.map((n) => [n.id, n]));
  const links = graph.edges
    .filter((e) => simNodeById.has(e.source) && simNodeById.has(e.target))
    .map((e) => ({
      source: simNodeById.get(e.source)!,
      target: simNodeById.get(e.target)!,
    }));

  const sim = forceSimulation(simNodes)
    .force("link", forceLink(links).id((d) => (d as TreeSimNode).id).distance(120).strength(0.15))
    .force("charge", forceManyBody().strength(-400))
    .force("collide", forceCollide(72))
    .stop();

  for (let i = 0; i < 120; i++) sim.tick();

  const final = new Map<string, LayoutPos>();
  for (const n of simNodes) {
    final.set(n.id, { x: n.x ?? cx, y: n.y ?? cy });
  }
  return final;
}

/** Stable constellation arc — fixed bend from edge id, no temporal wobble. */
export function constellationPath(
  from: LayoutPos,
  to: LayoutPos,
  edgeKey: string,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const h = hashSeed(edgeKey) % 1000;
  const bend = ((h / 1000) * 2 - 1) * dist * 0.06;
  const mx = (from.x + to.x) / 2 + nx * bend;
  const my = (from.y + to.y) / 2 + ny * bend;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export function nodeAnchor(pos: LayoutPos, type: string, end: "top" | "bottom"): LayoutPos {
  const offset = type === "seed" ? 68 : 54;
  return { x: pos.x, y: end === "bottom" ? pos.y + offset : pos.y - offset };
}
