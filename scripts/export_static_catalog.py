"""Export FMA catalog + CLAP embeddings for static GitHub Pages client."""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from src.config import settings  # noqa: E402

OUT = ROOT / "frontend" / "public" / "data"
EMBED_DIM = 512

BUCKETS = (
    "darkwave",
    "post_punk",
    "electronic",
    "dance",
    "ambient",
    "industrial",
    "indie",
    "synth",
)


def infer_bucket(track: dict) -> str:
    ids = track.get("identifiers") or {}
    tempo = float(ids.get("tempo", 120))
    energy = float(ids.get("energy", 0.5))
    dance = float(ids.get("danceability", 0.5))
    darkness = float(ids.get("harmonic_darkness", 0.5))
    texture = float(ids.get("texture_density", 0.5))
    rhythm = float(ids.get("rhythmic_complexity", 0.5))
    vocals = float((ids.get("stem_presence") or {}).get("vocals_pct", 15))
    if darkness >= 0.72 and tempo < 135:
        return "darkwave"
    if darkness >= 0.6 and rhythm >= 0.45:
        return "post_punk"
    if dance >= 0.72 and tempo >= 118:
        return "dance"
    if energy >= 0.72 and rhythm >= 0.5:
        return "electronic"
    if energy <= 0.42 and texture >= 0.55:
        return "ambient"
    if texture >= 0.7 and vocals <= 12:
        return "industrial"
    if tempo >= 110 and dance >= 0.55 and darkness < 0.5:
        return "synth"
    return "indie"


def main() -> int:
    index_path = Path(settings.catalog_dir) / "fma_index.json"
    npz_path = Path(settings.catalog_dir) / "fma_clap.npz"
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
    bucket_sums = {b: np.zeros(EMBED_DIM, dtype=np.float64) for b in BUCKETS}
    bucket_counts = {b: 0 for b in BUCKETS}

    for track in tracks:
        tid = track["track_id"]
        if tid not in id_to_row:
            continue
        row = id_to_row[tid]
        rows.append(row)
        vec = emb[row]
        bucket = infer_bucket(track)
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

    centroids: list[list[float]] = []
    for b in BUCKETS:
        if bucket_counts[b] > 0:
            c = (bucket_sums[b] / bucket_counts[b]).astype(np.float32)
            n = float(np.linalg.norm(c))
            if n > 1e-9:
                c = c / n
            centroids.append(c.tolist())
        else:
            centroids.append([0.0] * EMBED_DIM)

    (OUT / "bucket-centroids.json").write_text(json.dumps({"buckets": list(BUCKETS), "vectors": centroids}))

    # Offline CLAP text prototypes for common demo seeds
    prototypes: dict[str, list[float]] = {}
    try:
        from src.scoring.clap_driver import embed_text

        for label in (
            "New Order — Ceremony, post-punk, electronic, song, music",
            "The Cure — Plainsong, gothic rock, song, music",
            "Joy Division — Ceremony, post-punk, song, music",
            "Kurt Vile — Freeway, indie rock, song, music",
        ):
            prototypes[label.split("—")[0].strip().lower()] = embed_text(label)
    except Exception as exc:
        print(f"Warning: text prototypes skipped ({exc})", file=sys.stderr)

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
