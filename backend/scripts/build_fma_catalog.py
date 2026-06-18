"""Build FMA small catalog: metadata index + CLAP embeddings (resumable)."""

from __future__ import annotations

import argparse
import json
import logging
import sys
import zipfile
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("build_fma_catalog")


def _extract_fma_small(fma_dir: Path) -> bool:
    zpath = fma_dir / "fma_small.zip"
    dest = fma_dir / "fma_small"
    if dest.joinpath("000", "000002.mp3").exists():
        logger.info("fma_small already extracted")
        return True
    if not zpath.exists():
        logger.error("Missing %s — download fma_small.zip first", zpath)
        return False
    logger.info("Extracting %s (this takes several minutes)…", zpath)
    with zipfile.ZipFile(zpath) as zf:
        zf.extractall(fma_dir)
    logger.info("Extracted to %s", dest)
    return True


def _checkpoint_path() -> Path:
    from src.config import settings

    return Path(settings.catalog_dir) / "fma_embed_checkpoint.json"


def _load_checkpoint() -> dict[str, list[float]]:
    path = _checkpoint_path()
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {k: v for k, v in data.items() if isinstance(v, list)}


def _save_checkpoint(embeddings: dict[str, list[float]]) -> None:
    path = _checkpoint_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(embeddings), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build FMA catalog with CLAP embeddings")
    parser.add_argument("--skip-embed", action="store_true", help="Only build metadata index")
    parser.add_argument("--extract-only", action="store_true", help="Only extract fma_small.zip")
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

    fma_dir = Path(settings.fma_dir)
    purge_demo_tracks()

    if not args.skip_embed or args.extract_only:
        if not _extract_fma_small(fma_dir):
            if args.extract_only:
                return 1
        if args.extract_only:
            return 0

    tracks = build_fma_index_from_metadata()
    logger.info("Built metadata index for %d FMA tracks", len(tracks))
    save_fma_index(tracks)

    if args.skip_embed:
        return 0

    unload_ollama_models()
    checkpoint = _load_checkpoint()
    limit = args.limit or len(tracks)
    done = 0
    skipped = 0

    for i, track in enumerate(tracks[:limit]):
        tid = track["track_id"]
        if tid in checkpoint:
            continue
        path = track.get("audio_path") or ""
        if not path or not Path(path).exists():
            skipped += 1
            continue
        if (done + 1) % 25 == 0:
            logger.info("CLAP %d embedded, %d skipped — %s", done + 1, skipped, track.get("title", ""))
        try:
            checkpoint[tid] = embed_audio_file(path)
            done += 1
            if done % 100 == 0:
                _save_checkpoint(checkpoint)
        except Exception as exc:
            logger.warning("Skip %s: %s", tid, exc)
            skipped += 1

    if not checkpoint:
        logger.error("No embeddings produced — is fma_small extracted?")
        return 1

    _save_checkpoint(checkpoint)
    import numpy as np

    ids = list(checkpoint.keys())
    embeddings = np.array([checkpoint[k] for k in ids], dtype=np.float32)
    save_clap_embeddings(ids, embeddings)
    logger.info("Saved %d CLAP embeddings", len(ids))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
