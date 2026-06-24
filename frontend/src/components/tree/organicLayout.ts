import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
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
type TreeSimLink = { source: TreeSimNode; target: TreeSimNode; kind?: TreeEdge["kind"]; weight: number };

function isStructuralEdge(edge: TreeEdge): boolean {
  return edge.kind !== "seed_bridge" && edge.kind !== "bridge" && edge.kind !== "mesh";
}

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
  const cy = height * 0.48;
  const seeds = graph.nodes.filter((n) => n.id.startsWith("seed:"));
  const roots = seeds.length ? seeds : graph.nodes.filter((n) => n.type === "seed");
  const childrenOf = buildChildrenMap(graph.edges.filter(isStructuralEdge));
  const positions = new Map<string, LayoutPos>();

  // Seed supercluster — tight nucleus with slight scatter
  const seedSpread = roots.length <= 1 ? 0 : Math.min(620, 180 + Math.sqrt(roots.length) * 112);
  roots.forEach((seedNode, i) => {
    const angle = i * 2.399963229728653 + (rand() - 0.5) * 0.5;
    const normalized = Math.sqrt((i + 0.65) / Math.max(1, roots.length));
    const r = roots.length <= 1 ? 0 : seedSpread * normalized * (0.44 + rand() * 0.42);
    positions.set(seedNode.id, {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r * 0.62,
    });
  });

  const visited = new Set<string>(roots.map((s) => s.id));

  function placeFilament(parentId: string, depth: number) {
    const kids = childrenOf.get(parentId) ?? [];
    const parent = positions.get(parentId);
    if (!parent || !kids.length) return;

    const baseAngle = Math.atan2(parent.y - cy, parent.x - cx);
    const spread = Math.min(Math.PI * 0.95, 0.62 + kids.length * 0.13);
    const step = kids.length > 1 ? spread / (kids.length - 1) : 0;
    const armLen = 168 + depth * 118 + rand() * 74;

    kids.forEach((kidId, idx) => {
      if (visited.has(kidId)) return;
      visited.add(kidId);
      const offset = kids.length > 1 ? -spread / 2 + step * idx : rand() * 0.3 - 0.15;
      const angle = baseAngle + offset + (rand() - 0.5) * 0.22;
      const dist = armLen * (0.85 + rand() * 0.3);
      positions.set(kidId, {
        x: parent.x + Math.cos(angle) * dist,
        y: parent.y + Math.sin(angle) * dist + depth * 36,
      });
      placeFilament(kidId, depth + 1);
    });
  }

  for (const s of roots) {
    placeFilament(s.id, 1);
  }

  // Orphans (disconnected) — outer halo
  for (const n of graph.nodes) {
    if (!positions.has(n.id)) {
      const a = rand() * Math.PI * 2;
      const r = width * 0.2 + rand() * width * 0.1;
      positions.set(n.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  }

  // Light collision pass — separate overlaps without destroying filament shape
  const simNodes: TreeSimNode[] = graph.nodes.map((n) => {
    const p = positions.get(n.id)!;
    return { ...n, x: p.x, y: p.y };
  });
  const simNodeById = new Map(simNodes.map((n) => [n.id, n]));
  const links: TreeSimLink[] = graph.edges
    .filter((e) => simNodeById.has(e.source) && simNodeById.has(e.target))
    .map((e) => ({
      source: simNodeById.get(e.source)!,
      target: simNodeById.get(e.target)!,
      kind: e.kind,
      weight: e.weight,
    }));

  const sim = forceSimulation(simNodes)
    .force("center", forceCenter(cx, cy))
    .force(
      "link",
      forceLink<TreeSimNode, TreeSimLink>(links)
        .id((d) => d.id)
        .distance((d) => {
          if (d.kind === "seed_bridge") return 250;
          if (d.kind === "bridge") return 185;
          if (d.kind === "mesh") return 146;
          if (d.kind === "trunk") return 168;
          return 188;
        })
        .strength((d) => {
          if (d.kind === "seed_bridge") return 0.08;
          if (d.kind === "bridge") return 0.075;
          if (d.kind === "mesh") return 0.04;
          if (d.kind === "trunk") return 0.11;
          return 0.08;
        }),
    )
    .force("charge", forceManyBody().strength(-470))
    .force("x", forceX(cx).strength(0.012))
    .force("y", forceY(cy).strength(0.016))
    .force("collide", forceCollide((d) => ((d as TreeSimNode).type === "seed" ? 86 : 72)))
    .stop();

  for (let i = 0; i < 230; i++) sim.tick();

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
  const bend = ((h / 1000) * 2 - 1) * dist * 0.1;
  const mx = (from.x + to.x) / 2 + nx * bend;
  const my = (from.y + to.y) / 2 + ny * bend;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export function nodeAnchor(pos: LayoutPos, type: string, end: "top" | "bottom"): LayoutPos {
  const offset = type === "seed" ? 68 : 54;
  return { x: pos.x, y: end === "bottom" ? pos.y + offset : pos.y - offset };
}

export function nodeAnchorToward(pos: LayoutPos, type: string, target: LayoutPos): LayoutPos {
  const radius = type === "seed" ? 62 : 46;
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: pos.x + (dx / len) * radius, y: pos.y + (dy / len) * radius };
}
