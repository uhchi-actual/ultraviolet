import type { TreeGraph, TreeNode } from "@/lib/types";

import { getCatalog, loadCatalog, trackDedupeKey } from "./catalog";
import { recommendBranches } from "./scoring";
import { resolveSeed } from "./seeds";

function treeDepthConfig(numSeeds: number): [number, number, number] {
  if (numSeeds <= 1) return [24, 4, 2];
  if (numSeeds <= 3) return [16, 3, 2];
  if (numSeeds <= 5) return [12, 2, 1];
  return [8, 2, 1];
}

function graphNodeId(trackId: string, parentId?: string | null): string {
  return parentId ? `${trackId}::${parentId}` : trackId;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function buildManualTreeStatic(body: {
  songs: { title: string; artist?: string }[];
  recs_per_seed?: number;
  obscurity_dial?: number;
}): Promise<{ tree: TreeGraph; layout_seed: number }> {
  await loadCatalog();
  const catalog = getCatalog();
  if (catalog.length < 2) throw new Error("Static catalog failed to load");

  const resolved = body.songs
    .filter((s) => s.title?.trim())
    .map((s) => resolveSeed(s.title.trim(), (s.artist || "").trim()));

  if (!resolved.length) throw new Error("No songs could be resolved");

  let [l1, l2, l3] = treeDepthConfig(resolved.length);
  if (body.recs_per_seed != null) l1 = Math.max(body.recs_per_seed, l1);

  const buildSeed = (Math.random() * 0x7fffffff) | 0;
  const rng = mulberry32(buildSeed);
  const obscurity = body.obscurity_dial ?? 0.5;

  const excludeIds = new Set(resolved.map((s) => s.track_id));
  const excludeKeys = new Set(resolved.map(trackDedupeKey));
  const allRecs: {
    graph_id: string;
    track_id: string;
    title: string;
    artist: string;
    confidence: number;
    seed_track_id: string;
    parent_id: string;
    depth: number;
    genre_bucket?: string;
    ultraviolet_grade?: unknown;
    identifiers: Record<string, unknown>;
  }[] = [];
  const seenKeys = new Set<string>();

  for (const seed of resolved) {
    const l1Picks = recommendBranches(seed, catalog, l1, excludeIds, excludeKeys, obscurity, 1);
    for (const item of l1Picks) {
      const track = item.track;
      const key = trackDedupeKey(track);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const l1Node = graphNodeId(track.track_id, null);
      allRecs.push({
        graph_id: l1Node,
        track_id: track.track_id,
        title: track.title,
        artist: track.artist,
        confidence: Math.round(item.similarity * 1000) / 1000,
        seed_track_id: seed.track_id,
        parent_id: seed.track_id,
        depth: 1,
        genre_bucket: item.genre_bucket,
        ultraviolet_grade: item.ultraviolet_grade,
        identifiers: track.identifiers,
      });
      excludeKeys.add(key);
      excludeIds.add(track.track_id);

      const l2Picks = recommendBranches(track, catalog, l2, excludeIds, excludeKeys, obscurity, 2);
      for (const child of l2Picks) {
        const ct = child.track;
        const ck = trackDedupeKey(ct);
        if (seenKeys.has(ck)) continue;
        seenKeys.add(ck);
        const l2Node = graphNodeId(ct.track_id, l1Node);
        allRecs.push({
          graph_id: l2Node,
          track_id: ct.track_id,
          title: ct.title,
          artist: ct.artist,
          confidence: Math.round(child.similarity * 1000) / 1000,
          seed_track_id: seed.track_id,
          parent_id: l1Node,
          depth: 2,
          genre_bucket: child.genre_bucket,
          ultraviolet_grade: child.ultraviolet_grade,
          identifiers: ct.identifiers,
        });
        excludeKeys.add(ck);
        excludeIds.add(ct.track_id);

        const l3Picks = recommendBranches(ct, catalog, l3, excludeIds, excludeKeys, obscurity, 3);
        for (const grand of l3Picks) {
          const gt = grand.track;
          const gk = trackDedupeKey(gt);
          if (seenKeys.has(gk)) continue;
          seenKeys.add(gk);
          allRecs.push({
            graph_id: graphNodeId(gt.track_id, l2Node),
            track_id: gt.track_id,
            title: gt.title,
            artist: gt.artist,
            confidence: Math.round(grand.similarity * 1000) / 1000,
            seed_track_id: seed.track_id,
            parent_id: l2Node,
            depth: 3,
            genre_bucket: grand.genre_bucket,
            ultraviolet_grade: grand.ultraviolet_grade,
            identifiers: gt.identifiers,
          });
          excludeKeys.add(gk);
          excludeIds.add(gt.track_id);
        }
      }
    }
  }

  if (!allRecs.length) {
    throw new Error("No branches matched — try another artist/title or lower obscurity");
  }

  const nodes: TreeNode[] = [];
  const edges: TreeGraph["edges"] = [];
  const seenNodes = new Set<string>();

  for (const seed of resolved) {
    if (seenNodes.has(seed.track_id)) continue;
    seenNodes.add(seed.track_id);
    nodes.push({
      id: seed.track_id,
      title: seed.title,
      artist: seed.artist,
      type: "seed",
      genre_bucket: seed.genre_bucket,
      identifiers: seed.identifiers as TreeNode["identifiers"],
    });
  }

  for (const rec of allRecs) {
    if (seenNodes.has(rec.graph_id)) continue;
    seenNodes.add(rec.graph_id);
    nodes.push({
      id: rec.graph_id,
      title: rec.title,
      artist: rec.artist,
      type: "ai_recommendation",
      confidence: rec.confidence,
      genre_bucket: rec.genre_bucket,
      why_summary: "Branches from shared CLAP + spectral markers in the FMA catalog.",
      why_details: [],
      identifiers: rec.identifiers as TreeNode["identifiers"],
    });
    edges.push({
      source: rec.parent_id,
      target: rec.graph_id,
      weight: rec.confidence,
      ...(rec.depth === 1 ? { kind: "trunk" as const } : {}),
    });
  }

  return { tree: { nodes, edges, layout_seed: buildSeed }, layout_seed: buildSeed };
}
