"""Export FMA catalog + CLAP embeddings for static GitHub Pages client."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]

OUT = ROOT / "frontend" / "public" / "data"
EMBED_DIM = 512

DEFAULT_BUCKETS = (
    "Electronic",
    "Rock",
    "Pop",
    "Folk",
    "Instrumental",
    "Hip-Hop",
    "International",
    "Experimental",
)

TASTE_PROTOTYPE_GROUPS = (
    {
        "bucket": "Rock",
        "anchors": (
            "Future Islands",
            "High Places",
            "Indian Jewelry",
            "Kinski",
            "Thee Oh Sees",
            "Ariel Pink's Haunted Graffiti",
            "Twin Sister",
            "Sun Araw",
            "CAVE",
        ),
        "aliases": (
            "new order",
            "joy division",
            "the cure",
            "depeche mode",
            "bauhaus",
            "siouxsie and the banshees",
            "the chameleons",
            "echo and the bunnymen",
            "interpol",
            "the smiths",
            "the jesus and mary chain",
            "fontaines dc",
            "fontaines d c",
            "idles",
            "molchat doma",
            "ceremony",
            "plainsong",
        ),
    },
    {
        "bucket": "Electronic",
        "anchors": (
            "Dan Deacon",
            "Future Islands",
            "High Places",
            "Goto80",
            "Covox",
            "Mochipet",
            "Mr. Moods",
            "junior85",
        ),
        "aliases": (
            "chris stussy",
            "fred again",
            "fred again..",
            "daft punk",
            "aphex twin",
            "burial",
            "boards of canada",
            "four tet",
            "caribou",
            "jamie xx",
            "overmono",
            "bicep",
            "floating points",
            "disclosure",
            "justice",
            "the chemical brothers",
            "chemical brothers",
            "kraftwerk",
            "underworld",
            "lcd soundsystem",
            "talking heads",
        ),
    },
    {
        "bucket": "Pop",
        "anchors": (
            "Kurt Vile",
            "Cryptacize",
            "Carroll",
            "Azure Blue",
            "So Cow",
            "The Slants",
            "Au",
            "Twin Sister",
        ),
        "aliases": (
            "kurt vile",
            "pavement",
            "mac demarco",
            "yo la tengo",
            "tame impala",
            "unknown mortal orchestra",
            "alex g",
            "beach house",
            "big thief",
            "alvvays",
            "the strokes",
            "ariel pink",
            "thee oh sees",
            "future islands",
            "high places",
        ),
    },
    {
        "bucket": "Instrumental",
        "anchors": (
            "Blue Dot Sessions",
            "Ambienteer",
            "Lee Rosevere",
        ),
        "aliases": (
            "brian eno",
            "grouper",
            "william basinski",
            "tim hecker",
            "stars of the lid",
            "ambient",
            "drone",
        ),
    },
    {
        "bucket": "Hip-Hop",
        "anchors": (
            "Beastie Boys",
            "Kellee Maize",
            "Cullah",
            "Tha Silent Partner",
        ),
        "aliases": (
            "beastie boys",
            "madlib",
            "j dilla",
            "jdilla",
            "mf doom",
            "a tribe called quest",
            "hip hop",
        ),
    },
)


def norm_key(value: str) -> str:
    chars = [c.lower() if c.isalnum() else " " for c in value.replace("&", " and ")]
    return " ".join("".join(chars).split())


def infer_bucket(track: dict) -> str:
    existing = str(track.get("genre_bucket") or track.get("genre_top") or "").strip()
    if existing:
        return existing

    ids = track.get("identifiers") or {}
    tempo = float(ids.get("tempo", 120))
    energy = float(ids.get("energy", 0.5))
    dance = float(ids.get("danceability", 0.5))
    darkness = float(ids.get("harmonic_darkness", 0.5))
    texture = float(ids.get("texture_density", 0.5))
    rhythm = float(ids.get("rhythmic_complexity", 0.5))
    vocals = float((ids.get("stem_presence") or {}).get("vocals_pct", 15))
    if darkness >= 0.72 and tempo < 135:
        return "Rock"
    if darkness >= 0.6 and rhythm >= 0.45:
        return "Rock"
    if dance >= 0.72 and tempo >= 118:
        return "Electronic"
    if energy >= 0.72 and rhythm >= 0.5:
        return "Electronic"
    if energy <= 0.42 and texture >= 0.55:
        return "Instrumental"
    if texture >= 0.7 and vocals <= 12:
        return "Experimental"
    if tempo >= 110 and dance >= 0.55 and darkness < 0.5:
        return "Pop"
    return "Pop"


def normalized_vector(vec: np.ndarray) -> np.ndarray:
    out = np.asarray(vec, dtype=np.float32)
    norm = float(np.linalg.norm(out))
    if norm > 1e-9:
        out = out / norm
    return out


def main() -> int:
    catalog_dir = Path(os.environ.get("CATALOG_DIR", r"D:\ultraviolet-data\catalog"))
    index_path = catalog_dir / "fma_index.json"
    npz_path = catalog_dir / "fma_clap.npz"
    if not index_path.exists() or not npz_path.exists():
        print("Missing catalog — run FMA pipeline first", file=sys.stderr)
        return 1

    tracks = json.loads(index_path.read_text(encoding="utf-8"))
    data = np.load(npz_path, allow_pickle=True)
    ids = [str(x) for x in data["track_ids"].tolist()]
    emb = np.asarray(data["embeddings"], dtype=np.float32)
    id_to_row = {tid: i for i, tid in enumerate(ids)}

    OUT.mkdir(parents=True, exist_ok=True)

    rows: list[int] = []
    slim: list[dict] = []
    bucket_order = list(DEFAULT_BUCKETS)
    bucket_sums = {b: np.zeros(EMBED_DIM, dtype=np.float64) for b in bucket_order}
    bucket_counts = {b: 0 for b in bucket_order}

    def ensure_bucket(bucket: str) -> None:
        if bucket not in bucket_sums:
            bucket_order.append(bucket)
            bucket_sums[bucket] = np.zeros(EMBED_DIM, dtype=np.float64)
            bucket_counts[bucket] = 0

    for track in tracks:
        tid = track["track_id"]
        if tid not in id_to_row:
            continue
        row = id_to_row[tid]
        rows.append(row)
        vec = emb[row]
        bucket = infer_bucket(track)
        ensure_bucket(bucket)
        bucket_sums[bucket] += vec.astype(np.float64)
        bucket_counts[bucket] += 1
        slim.append(
            {
                "track_id": tid,
                "title": track.get("title", ""),
                "artist": track.get("artist", ""),
                "genre_top": track.get("genre_top", ""),
                "genres": track.get("genres", []),
                "genre_bucket": bucket,
                "identifiers": track.get("identifiers") or {},
            }
        )

    order = np.array(rows, dtype=np.int32)
    matrix = emb[order]

    (OUT / "fma-ids.json").write_text(json.dumps([t["track_id"] for t in slim]), encoding="utf-8")
    (OUT / "fma-index.json").write_text(json.dumps(slim, separators=(",", ":")), encoding="utf-8")
    with (OUT / "fma-embeddings.bin").open("wb") as fh:
        fh.write(matrix.astype(np.float32).tobytes())

    centroid_by_bucket: dict[str, np.ndarray] = {}
    centroids: list[list[float]] = []
    for b in bucket_order:
        if bucket_counts[b] > 0:
            c = normalized_vector(bucket_sums[b] / bucket_counts[b])
            centroid_by_bucket[b] = c
            centroids.append(c.tolist())
        else:
            zero = np.zeros(EMBED_DIM, dtype=np.float32)
            centroid_by_bucket[b] = zero
            centroids.append(zero.tolist())

    (OUT / "bucket-centroids.json").write_text(json.dumps({"buckets": bucket_order, "vectors": centroids}))

    artist_to_rows: dict[str, list[int]] = {}
    for i, track in enumerate(slim):
        artist_to_rows.setdefault(norm_key(track["artist"]), []).append(i)

    # Catalog-derived taste prototypes for common stale-rotation seeds.
    # They avoid loading a text model during CI and keep Pages fully static.
    prototypes: dict[str, list[float]] = {}
    for group in TASTE_PROTOTYPE_GROUPS:
        vectors: list[np.ndarray] = []
        for anchor in group["anchors"]:
            for row_idx in artist_to_rows.get(norm_key(anchor), []):
                vectors.append(np.asarray(matrix[row_idx], dtype=np.float32))
        if vectors:
            proto = normalized_vector(np.mean(vectors, axis=0))
        else:
            proto = centroid_by_bucket.get(group["bucket"], np.zeros(EMBED_DIM, dtype=np.float32))
        for alias in group["aliases"]:
            prototypes[norm_key(alias)] = proto.tolist()

    (OUT / "seed-prototypes.json").write_text(json.dumps(prototypes, separators=(",", ":")))

    manifest = {
        "version": 2,
        "count": len(slim),
        "embed_dim": EMBED_DIM,
        "build": "static-gh-pages",
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    mb = (OUT / "fma-embeddings.bin").stat().st_size / 1_048_576
    print(f"Exported {len(slim)} tracks ({mb:.1f} MB embeddings) -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
