import {
  DISCOVERY_CATALOG,
  FAMILIAR_LANDMARKS,
  exactFamiliarLandmark,
  inferStreamingGenre,
  type DiscoveryTrack,
  type StreamingTrack,
} from "@/lib/streaming";
import type { TreeEdge, TreeGraph, TreeNode } from "@/lib/types";

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

type RecommendationAgent = "genre agent" | "bridge agent" | "diversity agent" | "familiar seed";

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
  const base = agent === "genre agent" ? 0.89 : agent === "bridge agent" ? 0.8 : agent === "familiar seed" ? 0.76 : 0.72;
  const jitter = (hash(`${trackKey(seed)}|${trackKey(track)}|${agent}`) % 90) / 1000;
  return Math.round(Math.min(0.98, base + jitter) * 1000) / 1000;
}

function genreAffinity(a?: string, b?: string): number {
  if (!a || !b) return 0.32;
  if (a === b) return 1;
  if ((RELATED_GENRES[a] ?? []).includes(b) || (RELATED_GENRES[b] ?? []).includes(a)) return 0.68;
  return 0.28;
}

function nodeAffinity(a: TreeNode, b: TreeNode): number {
  const genreScore = genreAffinity(a.genre_bucket, b.genre_bucket);
  const sameArtist = clean(a.artist).toLowerCase() === clean(b.artist).toLowerCase() ? 0.08 : 0;
  const seedBridge = a.id.startsWith("seed:") && b.id.startsWith("seed:") ? 0.08 : 0;
  const landmark = a.type === "seed" || b.type === "seed" ? 0.03 : 0;
  const jitter = (hash(`${a.id}|${b.id}|mesh`) % 70) / 1000;
  return Math.min(0.98, genreScore + sameArtist + seedBridge + landmark + jitter);
}

function roundedWeight(value: number): number {
  return Math.round(Math.max(0.18, Math.min(0.98, value)) * 1000) / 1000;
}

function addUniqueEdge(
  edges: TreeEdge[],
  edgeKeys: Set<string>,
  source: string,
  target: string,
  weight: number,
  kind: NonNullable<TreeEdge["kind"]>,
): boolean {
  if (source === target) return false;
  const edgeKey = [source, target].sort().join("::");
  if (edgeKeys.has(edgeKey)) return false;
  edgeKeys.add(edgeKey);
  edges.push({ source, target, weight: roundedWeight(weight), kind });
  return true;
}

function rankedNeighbors(
  node: TreeNode,
  candidates: TreeNode[],
  basis: string,
): { node: TreeNode; affinity: number }[] {
  return candidates
    .filter((candidate) => candidate.id !== node.id)
    .map((candidate) => ({
      node: candidate,
      affinity: nodeAffinity(node, candidate),
    }))
    .sort((a, b) => {
      const affinityDelta = b.affinity - a.affinity;
      if (Math.abs(affinityDelta) > 0.001) return affinityDelta;
      return (hash(`${basis}|${a.node.id}`) >>> 0) - (hash(`${basis}|${b.node.id}`) >>> 0);
    });
}

function addInterconnectionEdges(
  nodes: TreeNode[],
  edges: TreeEdge[],
  primarySeedIds: Set<string>,
  layoutSeed: number,
): void {
  const edgeKeys = new Set(edges.map((edge) => [edge.source, edge.target].sort().join("::")));
  const primarySeeds = nodes.filter((node) => primarySeedIds.has(node.id));
  const maxSeedBridges = Math.min(18, Math.max(0, primarySeeds.length - 1));
  let seedBridges = 0;

  for (const seed of primarySeeds) {
    for (const { node, affinity } of rankedNeighbors(seed, primarySeeds, `${layoutSeed}|seed-bridge|${seed.id}`)) {
      if (affinity < 0.5) continue;
      if (addUniqueEdge(edges, edgeKeys, seed.id, node.id, 0.42 + affinity * 0.32, "seed_bridge")) {
        seedBridges++;
        break;
      }
    }
    if (seedBridges >= maxSeedBridges) break;
  }
}

function perSeedLimit(numSeeds: number, requested?: number): number {
  const cap = numSeeds <= 1 ? 10 : numSeeds <= 5 ? 5 : numSeeds <= 12 ? 3 : 1;
  return Math.min(Math.max(requested ?? cap, 2), cap);
}

function childLimit(numSeeds: number): number {
  if (numSeeds <= 1) return 2;
  if (numSeeds <= 5) return 1;
  return 0;
}

function exactCatalogMatch(track: StreamingTrack): DiscoveryTrack | undefined {
  const key = trackKey(track);
  return (
    DISCOVERY_CATALOG.find((candidate) => trackKey(candidate) === key) ||
    exactFamiliarLandmark(track)
  );
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
  allowFamiliar: boolean,
): PickedTrack[] {
  const seedGenre = exactCatalogMatch(seed)?.genre ?? inferStreamingGenre(seed);
  const related = new Set(RELATED_GENRES[seedGenre] ?? []);
  const familiarPool = FAMILIAR_LANDMARKS.filter(
    (track) => track.genre === seedGenre || related.has(track.genre),
  );
  const familiarSlot = allowFamiliar && familiarPool.length && count >= 3 ? Math.min(1, count - 1) : -1;
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
    if (i === familiarSlot) {
      const familiar = takeFromPool(familiarPool, used, `${basis}|familiar landmark`);
      if (familiar) {
        used.add(trackKey(familiar));
        picks.push({ track: familiar, agent: "familiar seed" });
        continue;
      }
    }
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
    .slice(0, 48);

  if (!seeds.length) throw new Error("No songs could be parsed");

  const seedKeys = new Set<string>();
  const used = new Set<string>();
  const nodes: TreeNode[] = [];
  const edges: TreeGraph["edges"] = [];
  const primarySeedIds = new Set<string>();
  const layoutSeed = hash(seeds.map(trackKey).join("|"));
  const l1 = perSeedLimit(seeds.length, body.recs_per_seed);
  const l2 = childLimit(seeds.length);
  const familiarBudget = Math.max(1, Math.min(3, Math.ceil(seeds.length / 10)));
  let familiarCount = 0;

  for (const [seedIndex, seed] of seeds.entries()) {
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
    primarySeedIds.add(seedNode.id);

    const allowFamiliar =
      familiarCount < familiarBudget &&
      (seedIndex === seeds.length - 1 || hash(`${layoutSeed}|${key}|familiar`) % 5 === 0);
    const firstLayer = pickTracks(seed, l1, used, `${layoutSeed}|${key}|l1`, allowFamiliar);
    familiarCount += firstLayer.filter((pick) => pick.agent === "familiar seed").length;
    for (const pick of firstLayer) {
      const nodeId = graphId("rec", pick.track, seedNode.id);
      nodes.push({
        id: nodeId,
        title: pick.track.title,
        artist: pick.track.artist,
        type: pick.agent === "familiar seed" ? "seed" : "ai_recommendation",
        confidence: confidence(seed, pick.track, pick.agent),
        genre_bucket: pick.track.genre,
        why_summary:
          pick.agent === "familiar seed"
            ? `Familiar landmark seed near ${seed.artist} - ${seed.title}: ${pick.track.why}.`
            : `${pick.agent} matched ${seed.artist} - ${seed.title}: ${pick.track.why}.`,
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
      const children = pickTracks(pick.track, l2, used, `${layoutSeed}|${trackKey(pick.track)}|l2`, false);
      for (const child of children) {
        const childId = graphId("rec", child.track, nodeId);
        nodes.push({
          id: childId,
          title: child.track.title,
          artist: child.track.artist,
          type: child.agent === "familiar seed" ? "seed" : "ai_recommendation",
          confidence: confidence(pick.track, child.track, child.agent),
          genre_bucket: child.track.genre,
          why_summary:
            child.agent === "familiar seed"
              ? `Familiar landmark seed near ${pick.track.artist} - ${pick.track.title}: ${child.track.why}.`
              : `${child.agent} branches from ${pick.track.artist} - ${pick.track.title}: ${child.track.why}.`,
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

  addInterconnectionEdges(nodes, edges, primarySeedIds, layoutSeed);

  return { tree: { nodes, edges, layout_seed: layoutSeed }, layout_seed: layoutSeed };
}
