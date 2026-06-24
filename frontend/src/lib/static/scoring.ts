import type { CatalogTrack } from "./catalog";
import { EMBED_DIM } from "./catalog";

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
  if (a.genre_bucket && a.genre_bucket === b.genre_bucket) return 0.78;
  return 0.1;
}

const QUEUEABLE_ARTIST_HINTS = [
  "aerial pink",
  "ariel pink",
  "azure blue",
  "beastie boys",
  "carroll",
  "cave",
  "covox",
  "cryptacize",
  "dan deacon",
  "future islands",
  "goto80",
  "high places",
  "indian jewelry",
  "kinski",
  "kurt vile",
  "lightning bolt",
  "mochipet",
  "mr. moods",
  "so cow",
  "sun araw",
  "the slants",
  "thee oh sees",
  "twin sister",
];

function qualityPrior(track: CatalogTrack): number {
  const artist = (track.artist || "").toLowerCase();
  const title = (track.title || "").toLowerCase();
  let score = 0.45;
  if (QUEUEABLE_ARTIST_HINTS.some((hint) => artist.includes(hint))) score += 0.45;
  if (["Electronic", "Rock", "Pop", "Folk"].includes(track.genre_bucket || track.genre_top || "")) {
    score += 0.1;
  }
  if (/\b(track|part|segment)\s*\d+\b|interview|chat w\/|untitled|skit|intro|outro|bonus/.test(title)) {
    score -= 0.35;
  }
  return Math.max(0, Math.min(1, score));
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
  if (parent.source === "clap_text" || parent.source === "prototype") return 0.25;
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
    const prior = qualityPrior(track);
    if (parent.source === "clap_text" || parent.source === "prototype") {
      const sClap = clapSimilarity(parent.clap_embedding || [], track.clap_embedding || []);
      const sGraph = graphScore(parent, track);
      sim = 0.58 * sClap + 0.32 * sGraph + 0.1 * prior;
      grade = {
        score: sim,
        confidence: 0.62,
        agreement: "taste_seed",
        drivers: { clap: sClap, stem: prior, spectral: 0, graph: sGraph },
      };
    } else {
      grade = ultravioletScore(parent, track);
      sim = 0.92 * grade.score + 0.08 * prior;
    }
    if (sim < minScore) continue;
    scored.push({
      track,
      similarity: sim,
      final_score: applyObscurityBonus(sim + prior * 0.04, 0, obscurityDial),
      genre_bucket: track.genre_bucket || track.genre_top || "Pop",
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
  const parentBucket = parent.genre_bucket || parent.genre_top || "";
  const sameBucket = parentBucket ? scored.filter((s) => s.genre_bucket === parentBucket) : [];
  const focusedCount = sameBucket.length >= count ? Math.ceil(count * 0.75) : 0;
  const focusedPicks = focusedCount ? pickMmr(sameBucket, focusedCount) : [];
  const focusedIds = new Set(focusedPicks.map((p) => p.track.track_id));
  const remainder = scored.filter((s) => !focusedIds.has(s.track.track_id));
  const genreN = Math.min(count - focusedPicks.length, Math.max(2, Math.floor(count / 4)));
  const genrePicks = pickGenreDiverse(remainder, genreN);
  const genreIds = new Set(genrePicks.map((p) => p.track.track_id));
  const mmrPool = remainder.filter((s) => !genreIds.has(s.track.track_id));
  const mmrPicks = pickMmr(mmrPool, count - focusedPicks.length - genrePicks.length);
  const merged = [...focusedPicks, ...genrePicks, ...mmrPicks];
  merged.sort((a, b) => b.final_score - a.final_score);
  return merged.slice(0, count);
}

export function inferBucketFromQuery(title: string, artist: string): string {
  const q = `${artist} ${title}`.toLowerCase();
  if (/hip.?hop|rap|beastie|madlib|dilla|doom|tribe/.test(q)) return "Hip-Hop";
  if (/ambient|eno|drone|grouper|basinski|tim hecker|stars of the lid/.test(q)) {
    return "Instrumental";
  }
  if (
    /chris stussy|fred again|daft|aphex|burial|boards of canada|four tet|caribou|jamie xx|overmono|bicep|floating points|disclosure|justice|chemical brothers|kraftwerk|underworld|lcd|talking heads|house|techno|electronic|dance|disco|synth/.test(q)
  ) {
    return "Electronic";
  }
  if (
    /cure|bauhaus|joy division|post.?punk|goth|darkwave|new order|depeche|siouxsie|chameleons|echo and the bunnymen|interpol|smiths|jesus and mary chain|fontaines|idles|molchat|punk|rock|thee oh sees|pavement/.test(q)
  ) {
    return "Rock";
  }
  if (/folk|country|americana|singer.?songwriter/.test(q)) return "Folk";
  if (/experimental|noise|industrial|nine inch|skinny puppy/.test(q)) return "Experimental";
  return "Pop";
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
