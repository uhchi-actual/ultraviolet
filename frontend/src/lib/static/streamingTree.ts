import {
  DISCOVERY_CATALOG,
  inferStreamingGenre,
  type DiscoveryTrack,
  type StreamingTrack,
} from "@/lib/streaming";
import type { TreeGraph, TreeNode } from "@/lib/types";

const RELATED_GENRES: Record<string, string[]> = {
  Rock: ["Experimental", "Electronic", "Pop"],
  Experimental: ["Rock", "Electronic", "Instrumental", "Hip-Hop"],
  Instrumental: ["Electronic", "Folk", "Experimental"],
  Folk: ["Pop", "Instrumental", "International"],
  Electronic: ["Experimental", "Pop", "Instrumental", "Hip-Hop"],
  Pop: ["Electronic", "Folk", "Rock"],
  "Hip-Hop": ["Electronic", "Experimental", "Pop"],
  International: ["Folk", "Electronic", "Experimental"],
};

type RecommendationAgent = "genre agent" | "bridge agent" | "diversity agent";

interface PickedTrack {
  track: DiscoveryTrack;
  agent: RecommendationAgent;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trackKey(track: Pick<StreamingTrack, "artist" | "title">): string {
  return `${clean(track.artist).toLowerCase()}::${clean(track.title).toLowerCase()}`;
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function confidence(seed: StreamingTrack, track: DiscoveryTrack, agent: RecommendationAgent): number {
  const base = agent === "genre agent" ? 0.89 : agent === "bridge agent" ? 0.8 : 0.72;
  const jitter = (hash(`${trackKey(seed)}|${trackKey(track)}|${agent}`) % 90) / 1000;
  return Math.round(Math.min(0.98, base + jitter) * 1000) / 1000;
}

function perSeedLimit(numSeeds: number, requested?: number): number {
  const cap = numSeeds <= 1 ? 12 : numSeeds <= 5 ? 7 : numSeeds <= 12 ? 4 : 3;
  return Math.min(Math.max(requested ?? cap, 2), cap);
}

function childLimit(numSeeds: number): number {
  if (numSeeds <= 1) return 2;
  if (numSeeds <= 8) return 1;
  return 0;
}

function exactCatalogMatch(track: StreamingTrack): DiscoveryTrack | undefined {
  const key = trackKey(track);
  return DISCOVERY_CATALOG.find((candidate) => trackKey(candidate) === key);
}

function ranked(pool: DiscoveryTrack[], basis: string): DiscoveryTrack[] {
  const seed = hash(basis);
  return [...pool].sort((a, b) => ((hash(trackKey(a)) ^ seed) >>> 0) - ((hash(trackKey(b)) ^ seed) >>> 0));
}

function takeFromPool(
  pool: DiscoveryTrack[],
  used: Set<string>,
  basis: string,
): DiscoveryTrack | null {
  return ranked(pool, basis).find((track) => !used.has(trackKey(track))) ?? null;
}

function pickTracks(
  seed: StreamingTrack,
  count: number,
  used: Set<string>,
  basis: string,
): PickedTrack[] {
  const seedGenre = exactCatalogMatch(seed)?.genre ?? inferStreamingGenre(seed);
  const related = new Set(RELATED_GENRES[seedGenre] ?? []);
  const pools: { agent: RecommendationAgent; tracks: DiscoveryTrack[] }[] = [
    {
      agent: "genre agent",
      tracks: DISCOVERY_CATALOG.filter((track) => track.genre === seedGenre),
    },
    {
      agent: "bridge agent",
      tracks: DISCOVERY_CATALOG.filter((track) => related.has(track.genre)),
    },
    {
      agent: "diversity agent",
      tracks: DISCOVERY_CATALOG.filter((track) => track.genre !== seedGenre && !related.has(track.genre)),
    },
  ];
  const picks: PickedTrack[] = [];

  for (let i = 0; i < count; i++) {
    const agentOrder = [pools[i % pools.length]!, pools[(i + 1) % pools.length]!, pools[(i + 2) % pools.length]!];
    let picked: PickedTrack | null = null;
    for (const pool of agentOrder) {
      const track = takeFromPool(pool.tracks, used, `${basis}|${pool.agent}|${i}`);
      if (track) {
        picked = { track, agent: pool.agent };
        break;
      }
    }
    if (!picked) break;
    used.add(trackKey(picked.track));
    picks.push(picked);
  }

  return picks;
}

function graphId(prefix: string, track: Pick<StreamingTrack, "artist" | "title">, parentId?: string): string {
  const parent = parentId ? `:${hash(parentId).toString(36)}` : "";
  return `${prefix}:${hash(trackKey(track)).toString(36)}${parent}`;
}

export async function buildStreamingTreeStatic(body: {
  songs: { title: string; artist?: string }[];
  recs_per_seed?: number;
}): Promise<{ tree: TreeGraph; layout_seed: number }> {
  const seeds = body.songs
    .map((song) => ({
      title: clean(song.title),
      artist: clean(song.artist || "Unknown artist"),
      source: "paste" as const,
    }))
    .filter((song) => song.title && song.artist)
    .slice(0, 50);

  if (!seeds.length) throw new Error("No songs could be parsed");

  const seedKeys = new Set<string>();
  const used = new Set<string>();
  const nodes: TreeNode[] = [];
  const edges: TreeGraph["edges"] = [];
  const layoutSeed = hash(seeds.map(trackKey).join("|"));
  const l1 = perSeedLimit(seeds.length, body.recs_per_seed);
  const l2 = childLimit(seeds.length);

  for (const seed of seeds) {
    const key = trackKey(seed);
    if (seedKeys.has(key)) continue;
    seedKeys.add(key);
    used.add(key);

    const matched = exactCatalogMatch(seed);
    const seedNode: TreeNode = {
      id: graphId("seed", seed),
      title: seed.title,
      artist: seed.artist,
      type: "seed",
      genre_bucket: matched?.genre ?? inferStreamingGenre(seed),
      why_summary: "Playlist seed analyzed locally by genre and motif.",
      identifiers: {},
    };
    nodes.push(seedNode);

    const firstLayer = pickTracks(seed, l1, used, `${layoutSeed}|${key}|l1`);
    for (const pick of firstLayer) {
      const nodeId = graphId("rec", pick.track, seedNode.id);
      nodes.push({
        id: nodeId,
        title: pick.track.title,
        artist: pick.track.artist,
        type: "ai_recommendation",
        confidence: confidence(seed, pick.track, pick.agent),
        genre_bucket: pick.track.genre,
        why_summary: `${pick.agent} matched ${seed.artist} - ${seed.title}: ${pick.track.why}.`,
        why_details: [],
        identifiers: {},
      });
      edges.push({
        source: seedNode.id,
        target: nodeId,
        weight: confidence(seed, pick.track, pick.agent),
        kind: "trunk",
      });

      if (!l2) continue;
      const children = pickTracks(pick.track, l2, used, `${layoutSeed}|${trackKey(pick.track)}|l2`);
      for (const child of children) {
        const childId = graphId("rec", child.track, nodeId);
        nodes.push({
          id: childId,
          title: child.track.title,
          artist: child.track.artist,
          type: "ai_recommendation",
          confidence: confidence(pick.track, child.track, child.agent),
          genre_bucket: child.track.genre,
          why_summary: `${child.agent} branches from ${pick.track.artist} - ${pick.track.title}: ${child.track.why}.`,
          why_details: [],
          identifiers: {},
        });
        edges.push({
          source: nodeId,
          target: childId,
          weight: confidence(pick.track, child.track, child.agent),
        });
      }
    }
  }

  if (nodes.length <= seedKeys.size) {
    throw new Error("No discovery branches matched this rotation");
  }

  return { tree: { nodes, edges, layout_seed: layoutSeed }, layout_seed: layoutSeed };
}
