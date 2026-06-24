import type { CatalogTrack } from "./catalog";
import { getCatalog, getCentroid, getPrototype, prototypeKey, trackDedupeKey } from "./catalog";
import {
  blendEmbeddings,
  defaultIdentifiers,
  inferBucketFromQuery,
} from "./scoring";

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function matchScore(title: string, artist: string, track: CatalogTrack): number {
  const tIn = norm(title);
  const aIn = norm(artist);
  const tCat = norm(track.title);
  const aCat = norm(track.artist);
  if (!tIn) return 0;
  let score = 0;
  if (tIn === tCat) score += 4;
  else if (tCat.includes(tIn) || tIn.includes(tCat)) score += 2.5;
  if (aIn) {
    if (aIn === aCat) score += 4;
    else if (aCat.includes(aIn) || aIn.includes(aCat)) score += 2.5;
  }
  return score;
}

export function searchFma(query: string, limit = 12): CatalogTrack[] {
  const catalog = getCatalog();
  let title = query.trim();
  let artist = "";
  const byDash = query.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
  if (byDash) {
    artist = byDash[1]!.trim();
    title = byDash[2]!.trim();
  }
  for (const sep of [" - ", " – ", " — "]) {
    if (query.includes(sep)) {
      [artist, title] = query.split(sep, 2).map((s) => s.trim());
      break;
    }
  }
  const scored: { s: number; t: CatalogTrack }[] = [];
  for (const t of catalog) {
    const s = matchScore(title, artist, t);
    if (s > 0) scored.push({ s, t });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.t);
}

function resolveFmaSeed(title: string, artist: string): CatalogTrack | null {
  const hits = searchFma(artist ? `${artist} - ${title}` : title, 12);
  let best: { s: number; t: CatalogTrack } | null = null;
  for (const t of hits) {
    const s = matchScore(title, artist, t);
    if (s < 4 || !t.clap_embedding?.length) continue;
    if (!best || s > best.s) best = { s, t };
  }
  return best?.t ?? null;
}

function resolvePrototypeSeed(title: string, artist: string): CatalogTrack | null {
  const keys = [
    prototypeKey(artist),
    prototypeKey(title),
    prototypeKey(`${artist} ${title}`),
  ];
  for (const k of keys) {
    const proto = getPrototype(k);
    if (proto?.length) {
      return {
        track_id: `proto_${k.replace(/\W+/g, "_")}`,
        title,
        artist: artist || "Unknown",
        genre_top: "",
        genres: [],
        genre_bucket: inferBucketFromQuery(title, artist),
        identifiers: defaultIdentifiers(),
        clap_embedding: proto,
        source: "prototype",
      };
    }
  }
  return null;
}

function resolveNeighborSeed(title: string, artist: string): CatalogTrack {
  const catalog = getCatalog();
  const scored: { s: number; t: CatalogTrack }[] = [];
  for (const t of catalog) {
    const s = matchScore(title, artist, t);
    if (s > 0.5) scored.push({ s, t });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 40);
  if (top.length >= 3) {
    const emb = blendEmbeddings(
      top.filter((x) => x.t.clap_embedding?.length).map((x) => ({ w: x.s, vec: x.t.clap_embedding! })),
    );
    return {
      track_id: `blend_${norm(artist)}_${norm(title)}`.replace(/\W+/g, "_"),
      title,
      artist: artist || "Unknown",
      genre_top: "",
      genres: [],
      genre_bucket: inferBucketFromQuery(title, artist),
      identifiers: defaultIdentifiers(),
      clap_embedding: emb,
      source: "clap_text",
    };
  }
  const bucket = inferBucketFromQuery(title, artist);
  const centroid = getCentroid(bucket) || getCentroid("indie") || [];
  return {
    track_id: `centroid_${bucket}`,
    title,
    artist: artist || "Unknown",
    genre_top: "",
    genres: [],
    genre_bucket: bucket,
    identifiers: defaultIdentifiers(),
    clap_embedding: centroid,
    source: "clap_text",
  };
}

export function resolveSeed(title: string, artist = ""): CatalogTrack {
  const t = title.trim();
  const a = artist.trim();
  if (!t) throw new Error("Song title is required");
  return (
    resolveFmaSeed(t, a) ||
    resolvePrototypeSeed(t, a) ||
    resolveNeighborSeed(t, a)
  );
}

export { trackDedupeKey };
