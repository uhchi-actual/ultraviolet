import { dataUrl } from "./paths";

export const EMBED_DIM = 512;

export interface CatalogTrack {
  track_id: string;
  title: string;
  artist: string;
  genre_top: string;
  genres: number[];
  genre_bucket: string;
  identifiers: Record<string, unknown>;
  clap_embedding?: number[];
  source?: string;
}

interface BucketCentroids {
  buckets: string[];
  vectors: number[][];
}

let _tracks: CatalogTrack[] | null = null;
let _embeddings: Float32Array | null = null;
let _ids: string[] | null = null;
let _centroids: BucketCentroids | null = null;
let _prototypes: Record<string, number[]> | null = null;
let _load: Promise<void> | null = null;

export function loadCatalog(): Promise<void> {
  if (_load) return _load;
  _load = (async () => {
    const [manifest, ids, indexBuf, centroids, prototypes] = await Promise.all([
      fetch(dataUrl("manifest.json")).then((r) => r.json()),
      fetch(dataUrl("fma-ids.json")).then((r) => r.json() as Promise<string[]>),
      fetch(dataUrl("fma-embeddings.bin")).then((r) => r.arrayBuffer()),
      fetch(dataUrl("bucket-centroids.json")).then((r) => r.json() as Promise<BucketCentroids>),
      fetch(dataUrl("seed-prototypes.json")).then((r) => r.json() as Promise<Record<string, number[]>>),
    ]);
    _ids = ids;
    _embeddings = new Float32Array(indexBuf);
    _tracks = await fetch(dataUrl("fma-index.json")).then((r) => r.json());
    _centroids = centroids;
    _prototypes = prototypes;
    if (manifest.count !== _tracks!.length) {
      console.warn("Catalog manifest count mismatch", manifest.count, _tracks!.length);
    }
    // Attach embedding views
    for (let i = 0; i < _tracks!.length; i++) {
      _tracks![i].clap_embedding = Array.from(
        _embeddings.subarray(i * EMBED_DIM, (i + 1) * EMBED_DIM),
      );
    }
  })();
  return _load;
}

export function getCatalog(): CatalogTrack[] {
  if (!_tracks) throw new Error("Catalog not loaded");
  return _tracks;
}

export function catalogCount(): number {
  return _tracks?.length ?? 0;
}

export function getCentroid(bucket: string): number[] | null {
  if (!_centroids) return null;
  const idx = _centroids.buckets.indexOf(bucket);
  return idx >= 0 ? _centroids.vectors[idx] : null;
}

export function getPrototype(key: string): number[] | null {
  return _prototypes?.[key.toLowerCase()] ?? null;
}

export function trackDedupeKey(t: CatalogTrack): string {
  return `${(t.artist || "").toLowerCase()}|${(t.title || "").toLowerCase()}`;
}
