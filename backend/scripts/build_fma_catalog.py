"""Build FMA small catalog: metadata index + CLAP embeddings for all 8,000 tracks."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("build_fma_catalog")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build FMA catalog with CLAP embeddings")
    parser.add_argument("--skip-embed", action="store_true", help="Only build metadata index")
    parser.add_argument("--limit", type=int, default=0, help="Max tracks to embed (0 = all)")
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from src.catalog.fma import (
        build_fma_index_from_metadata,
        save_clap_embeddings,
        save_fma_index,
    )
    from src.config import settings
    from src.recommendation.catalog import purge_demo_tracks
    from src.scoring.clap_driver import embed_audio_file
    from src.utils.ollama_vram import unload_ollama_models

    purge_demo_tracks()
    logger.info("Purged fake demo tracks from user catalog")

    tracks = build_fma_index_from_metadata()
    logger.info("Built metadata index for %d FMA small tracks", len(tracks))
    save_fma_index(tracks)

    if args.skip_embed:
        return 0

    unload_ollama_models()
    limit = args.limit or len(tracks)
    ids: list[str] = []
    embeddings: list[list[float]] = []

    for i, track in enumerate(tracks[:limit]):
        path = track.get("audio_path") or ""
        tid = track["track_id"]
        if not path or not Path(path).exists():
            continue
        if (i + 1) % 50 == 0:
            logger.info("CLAP embedding %d / %d — %s", i + 1, limit, track.get("title", ""))
        try:
            emb = embed_audio_file(path)
            ids.append(tid)
            embeddings.append(emb)
        except Exception as exc:
            logger.warning("Skip %s: %s", tid, exc)

    if not ids:
        logger.error(
            "No audio embedded. Download fma_small.zip to %s/fma_small/",
            settings.fma_dir,
        )
        return 1

    import numpy as np

    save_clap_embeddings(ids, np.array(embeddings, dtype=np.float32))
    logger.info("Embedded %d tracks with CLAP", len(ids))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
