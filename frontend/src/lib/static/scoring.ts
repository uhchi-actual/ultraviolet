import type { CatalogTrack } from "./catalog";
import { EMBED_DIM, getCentroid, getPrototype } from "./catalog";

const MIN_SIMILARITY = 0.6;

export function clapSimilarity(a: number[], b: number[]): number {
  if (a.length < 8 || b.length < 8) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return Math.max(0, Math.min(1, dot));
}

function featureVector(ids: Record<string, unknown>): number[] {
  const sp = (ids.stem_presence as Record<string, number>) || {};
  return [
    Number(ids.tempo ?? 120) / 200,
    Number(ids.energy ?? 0.5),
    Number(ids.danceability ?? 0.5),
    Number(ids.instrumentalness ?? 0.5),
    Number(ids.valence ?? 0.5),
    Number(ids.texture_density ?? 0.5),
    Number(ids.rhythmic_complexity ?? 0.5),
    Number(ids.harmonic_darkness ?? 0.5),
    Number(sp.drums_pct ?? 25) / 100,
    Number(sp.bass_pct ?? 25) / 100,
    Number(sp.vocals_pct ?? 25) / 100,
  ];
}

export function spectralSimilarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const va = featureVector(a);
  const vb = featureVector(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < va.length; i++) {
    dot += va[i]! * vb[i]!;
    na += va[i]! * va[i]!;
    nb += vb[i]! * vb[i]!;
  }
  if (na === 0 || nb === 0) return 0.5;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function graphScore(a: CatalogTrack, b: CatalogTrack): number {
  const ga = (a.genre_top || "").toLowerCase();
  const gb = (b.genre_top || "").toLowerCase();
  if (ga && ga === gb) return 1;
  if (ga && gb && (ga.includes(gb) || gb.includes(ga))) return 0.7;
  if (a.genre_bucket && a.genre_bucket === b.genre_bucket) return 0.55;
  return 0.1;
}

export interface UltravioletGrade {
  score: number;
  confidence: number;
  agreement: string;
  drivers: { clap: number; stem: number; spectral: number; graph: number };
}

export function ultravioletScore(a: CatalogTrack, b: CatalogTrack): UltravioletGrade {
  const embA = a.clap_embedding || [];
  const embB = b.clap_embedding || [];
  const sClap = clapSimilarity(embA, embB);
  const sSpectral = spectralSimilarity(a.identifiers, b.identifiers);
  const sGraph = graphScore(a, b);
  const sStem = sSpectral * 0.85;
  const raw = 0.52 * sClap + 0.28 * sStem + 0.2 * sSpectral + 0.15 * sGraph;
  const norm = 0.52 + 0.28 + 0.2 + 0.15;
  const score = raw / norm;
  const scores = [sClap, sStem, sSpectral, sGraph];
  const mean = scores.reduce((x, y) => x + y, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  return {
    score,
    confidence: 1 - Math.min(variance * 4, 0.5),
    agreement: variance < 0.05 ? "high" : variance < 0.15 ? "moderate" : "divergent",
    drivers: {
      clap: Math.round(sClap * 1000) / 1000,
      stem: Math.round(sStem * 1000) / 1000,
      spectral: Math.round(sSpectral * 1000) / 1000,
      graph: Math.round(sGraph * 1000) / 1000,
    },
  };
}

export function applyObscurityBonus(sim: number, _pop: number, dial: number): number {
  return sim + dial * 0.02 * (Math.random() - 0.5);
}

function effectiveMinScore(catalogSize: number, depth: number, parent: CatalogTrack): number {
  if (parent.source === "clap_text" || parent.source === "prototype") return 0.03;
  let floor = MIN_SIMILARITY * 0.65;
  if (catalogSize > 1000) floor = 0.45;
  return Math.max(0.35, floor - depth * 0.02);
}

export interface ScoredPick {
  track: CatalogTrack;
  similarity: number;
  final_score: number;
  genre_bucket: string;
  ultraviolet_grade: UltravioletGrade;
}

export function scoreCatalog(
  parent: CatalogTrack,
  catalog: CatalogTrack[],
  excludeIds: Set<string>,
  excludeKeys: Set<string>,
  obscurityDial: number,
  depth: number,
): ScoredPick[] {
  const minScore = effectiveMinScore(catalog.length, depth, parent);
  const scored: ScoredPick[] = [];
  for (const track of catalog) {
    if (excludeIds.has(track.track_id) || track.track_id === parent.track_id) continue;
    const key = `${track.artist}|${track.title}`.toLowerCase();
    if (excludeKeys.has(key)) continue;

    let grade: UltravioletGrade;
    let sim: number;
    if (parent.source === "clap_text" || parent.source === "prototype") {
      sim = clapSimilarity(parent.clap_embedding || [], track.clap_embedding || []);
      grade = {
        score: sim,
        confidence: 0.5,
        agreement: "clap_text",
        drivers: { clap: sim, stem: 0, spectral: 0, graph: 0 },
      };
    } else {
      grade = ultravioletScore(parent, track);
      sim = grade.score;
    }
    if (sim < minScore) continue;
    scored.push({
      track,
      similarity: sim,
      final_score: applyObscurityBonus(sim, 0, obscurityDial),
      genre_bucket: track.genre_bucket || "indie",
      ultraviolet_grade: grade,
    });
  }
  scored.sort((a, b) => b.final_score - a.final_score);
  return scored;
}

export function pickGenreDiverse(scored: ScoredPick[], count: number): ScoredPick[] {
  const byBucket = new Map<string, ScoredPick[]>();
  for (const item of scored) {
    const b = item.genre_bucket;
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push(item);
  }
  const buckets = [...byBucket.keys()].sort((a, b) => byBucket.get(b)!.length - byBucket.get(a)!.length);
  const picked: ScoredPick[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (picked.length < count && buckets.length) {
    const bucket = buckets[round % buckets.length]!;
    const pool = byBucket.get(bucket) || [];
    while (pool.length) {
      const item = pool.shift()!;
      if (seen.has(item.track.track_id)) continue;
      seen.add(item.track.track_id);
      picked.push(item);
      break;
    }
    round++;
    if (round > count * buckets.length * 2) break;
  }
  return picked;
}

export function pickMmr(scored: ScoredPick[], count: number): ScoredPick[] {
  if (!scored.length || count <= 0) return [];
  const pool = scored.map((s) => ({ ...s, final_score: s.final_score + Math.random() * 0.05 }));
  pool.sort((a, b) => b.final_score - a.final_score);
  const picked: ScoredPick[] = [pool.shift()!];
  while (picked.length < count && pool.length) {
    let bestIdx = 0;
    let bestMmr = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i]!;
      let maxRed = 0;
      for (const prev of picked) {
        maxRed = Math.max(maxRed, ultravioletScore(cand.track, prev.track).score);
      }
      const mmr = 0.7 * cand.similarity - 0.3 * maxRed + Math.random() * 0.03;
      if (mmr > bestMmr) {
        bestMmr = mmr;
        bestIdx = i;
      }
    }
    picked.push(pool.splice(bestIdx, 1)[0]!);
  }
  return picked;
}

export function recommendBranches(
  parent: CatalogTrack,
  catalog: CatalogTrack[],
  count: number,
  excludeIds: Set<string>,
  excludeKeys: Set<string>,
  obscurityDial: number,
  depth: number,
): ScoredPick[] {
  const scored = scoreCatalog(parent, catalog, excludeIds, excludeKeys, obscurityDial, depth);
  if (!scored.length) return [];
  const genreN = Math.min(count, Math.max(4, Math.floor(count / 2)));
  const genrePicks = pickGenreDiverse(scored, genreN);
  const genreIds = new Set(genrePicks.map((p) => p.track.track_id));
  const remainder = scored.filter((s) => !genreIds.has(s.track.track_id));
  const mmrPicks = pickMmr(remainder, count - genrePicks.length);
  const merged = [...genrePicks, ...mmrPicks];
  merged.sort((a, b) => b.final_score - a.final_score);
  return merged.slice(0, count);
}

export function inferBucketFromQuery(title: string, artist: string): string {
  const q = `${artist} ${title}`.toLowerCase();
  if (/cure|bauhaus|joy|post.?punk|goth|darkwave|new order|depeche/.test(q)) return "post_punk";
  if (/techno|house|electronic|daft|aphex/.test(q)) return "electronic";
  if (/ambient|eno|drone/.test(q)) return "ambient";
  if (/industrial|nine inch|skinny puppy/.test(q)) return "industrial";
  if (/dance|disco|lcd/.test(q)) return "dance";
  return "indie";
}

export function blendEmbeddings(items: { w: number; vec: number[] }[]): number[] {
  const out = new Array(EMBED_DIM).fill(0);
  let tw = 0;
  for (const { w, vec } of items) {
    if (vec.length < EMBED_DIM) continue;
    tw += w;
    for (let i = 0; i < EMBED_DIM; i++) out[i] += w * vec[i]!;
  }
  if (tw < 1e-9) return out;
  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i++) {
    out[i] /= tw;
    norm += out[i]! * out[i]!;
  }
  norm = Math.sqrt(norm);
  if (norm > 1e-9) for (let i = 0; i < EMBED_DIM; i++) out[i] /= norm;
  return out;
}

export function defaultIdentifiers(): Record<string, unknown> {
  return {
    tempo: 120,
    energy: 0.5,
    danceability: 0.5,
    instrumentalness: 0.5,
    valence: 0.5,
    texture_density: 0.5,
    rhythmic_complexity: 0.5,
    harmonic_darkness: 0.5,
    stem_presence: { drums_pct: 25, bass_pct: 25, other_pct: 25, vocals_pct: 25 },
  };
}
