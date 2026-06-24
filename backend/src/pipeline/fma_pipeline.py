"""Fully automated FMA pipeline: download → extract → CLAP embed. Writes live status to disk."""

from __future__ import annotations

import json
import logging
import sys
import time
import zipfile
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fma_pipeline")

FMA_URL = "https://os.unil.cloud.switch.ch/fma/fma_small.zip"


def _acquire_lock() -> bool:
    from src.pipeline.fma_status import lock_path

    p = lock_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        return False
    p.write_text(str(time.time()), encoding="utf-8")
    return True


def _release_lock() -> None:
    from src.pipeline.fma_status import lock_path

    p = lock_path()
    if p.exists():
        p.unlink(missing_ok=True)


def _set_phase(status: dict, phase: str, message: str = "") -> dict:
    status["phase"] = phase
    status["message"] = message
    status["running"] = True
    return status


def download_with_progress(status: dict) -> dict:
    import httpx

    from src.config import settings
    from src.pipeline.fma_status import FMA_ZIP_TOTAL_BYTES, write_status

    zip_path = Path(settings.fma_dir) / "fma_small.zip"
    zip_path.parent.mkdir(parents=True, exist_ok=True)

    existing = zip_path.stat().st_size if zip_path.exists() else 0
    total = FMA_ZIP_TOTAL_BYTES

    if existing >= total - 1_000_000:
        logger.info("Download already complete (%d bytes)", existing)
        status = _set_phase(status, "downloading", "Download already complete")
        write_status(status)
        return status

    headers = {}
    mode = "wb"
    if existing > 0:
        headers["Range"] = f"bytes={existing}-"
        mode = "ab"
        logger.info("Resuming download from %.2f GB", existing / 1e9)

    status = _set_phase(status, "downloading", "Downloading fma_small.zip")
    status["_started_at"] = status.get("_started_at") or time.time()
    write_status(status)

    started = time.time()
    last_write = 0.0

    with httpx.stream("GET", FMA_URL, headers=headers, follow_redirects=True, timeout=None) as resp:
        resp.raise_for_status()
        with zip_path.open(mode) as fh:
            for chunk in resp.iter_bytes(chunk_size=1024 * 1024):
                fh.write(chunk)
                now = time.time()
                if now - last_write >= 1.0:
                    status = __import__(
                        "src.pipeline.fma_status", fromlist=["snapshot_from_disk"]
                    ).snapshot_from_disk(status)
                    status["phase"] = "downloading"
                    status["message"] = "Downloading fma_small.zip"
                    status["running"] = True
                    status["download"]["elapsed_sec"] = round(now - started, 1)
                    write_status(status)
                    last_write = now

    status = __import__(
        "src.pipeline.fma_status", fromlist=["snapshot_from_disk"]
    ).snapshot_from_disk(status)
    status["phase"] = "downloading"
    status["message"] = "Download finished"
    write_status(status)
    return status


def extract_zip(status: dict) -> dict:
    from src.config import settings
    from src.pipeline.fma_status import write_status

    fma_dir = Path(settings.fma_dir)
    zip_path = fma_dir / "fma_small.zip"
    marker = fma_dir / "fma_small" / "000" / "000002.mp3"

    if marker.exists():
        logger.info("Already extracted")
        return status

    status = _set_phase(status, "extracting", "Extracting fma_small.zip (10+ minutes)")
    write_status(status)
    logger.info("Extracting %s …", zip_path)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(fma_dir)
    status["extract"] = {"done": True}
    status["message"] = "Extraction complete"
    write_status(status)
    return status


def embed_catalog(status: dict) -> dict:
    from src.catalog.fma import build_fma_index_from_metadata, save_clap_embeddings, save_fma_index
    from src.config import settings
    from src.pipeline.fma_status import write_status
    from src.recommendation.catalog import purge_demo_tracks
    from src.scoring.clap_driver import embed_audio_file
    from src.utils.ollama_vram import unload_ollama_models

    purge_demo_tracks()
    tracks = build_fma_index_from_metadata()
    save_fma_index(tracks)

    checkpoint_path = Path(settings.catalog_dir) / "fma_embed_checkpoint.json"
    checkpoint: dict[str, list[float]] = {}
    if checkpoint_path.exists():
        checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))

    unload_ollama_models()
    status = _set_phase(status, "embedding", "CLAP embedding all FMA tracks")
    status["embed"]["total"] = len(tracks)
    write_status(status)

    for i, track in enumerate(tracks):
        tid = track["track_id"]
        if tid in checkpoint:
            continue
        path = track.get("audio_path") or ""
        if not path or not Path(path).exists():
            continue
        if (i + 1) % 5 == 0 or i == 0:
            status["embed"]["done"] = len(checkpoint)
            status["embed"]["current_title"] = track.get("title", "")
            status["embed"]["percent"] = round(100 * len(checkpoint) / len(tracks), 1)
            status["message"] = f"Embedding {len(checkpoint)}/{len(tracks)}"
            write_status(status)
            logger.info("CLAP %d/%d — %s", len(checkpoint), len(tracks), track.get("title", ""))
        try:
            checkpoint[tid] = embed_audio_file(path)
        except Exception as exc:
            logger.warning("Skip %s: %s", tid, exc)
        if len(checkpoint) % 100 == 0:
            checkpoint_path.write_text(json.dumps(checkpoint), encoding="utf-8")

    checkpoint_path.write_text(json.dumps(checkpoint), encoding="utf-8")
    import numpy as np

    ids = list(checkpoint.keys())
    if not ids:
        raise RuntimeError("CLAP embedding produced 0 tracks — check clap_driver and audio paths")

    embeddings = np.array([checkpoint[k] for k in ids], dtype=np.float32)
    save_clap_embeddings(ids, embeddings)

    status["phase"] = "complete"
    status["complete"] = True
    status["running"] = False
    status["message"] = f"Done — {len(ids)} tracks embedded"
    status["embed"]["done"] = len(ids)
    status["embed"]["percent"] = 100.0
    write_status(status)
    return status


def run_pipeline(*, download_only: bool = False, embed_only: bool = False) -> int:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from src.pipeline.fma_status import default_status, snapshot_from_disk, write_status

    if not _acquire_lock():
        logger.error("Pipeline already running (lock file exists)")
        return 1

    status = default_status()
    try:
        # If curl is already downloading, wait until done instead of fighting it
        zip_path = (
            Path(status.get("zip_path", ""))
            or Path(__import__("src.config", fromlist=["settings"]).settings.fma_dir)
            / "fma_small.zip"
        )
        from src.pipeline.fma_status import FMA_ZIP_TOTAL_BYTES

        if zip_path.exists() and zip_path.stat().st_size < FMA_ZIP_TOTAL_BYTES - 1_000_000:
            status = _set_phase(
                status, "downloading", "Waiting for download to finish (or downloading)"
            )
            status["_started_at"] = time.time()
            write_status(status)
            logger.info("Monitoring existing download…")
            while True:
                status = snapshot_from_disk(status)
                status["phase"] = "downloading"
                status["running"] = True
                write_status(status)
                if status["download"]["bytes"] >= FMA_ZIP_TOTAL_BYTES - 1_000_000:
                    break
                time.sleep(1)
        else:
            status = download_with_progress(status)

        if download_only:
            return 0

        if not embed_only:
            status = extract_zip(status)
        status = embed_catalog(status)
        logger.info("Pipeline complete")
        return 0
    except Exception as exc:
        status = snapshot_from_disk(status)
        status["phase"] = "error"
        status["message"] = str(exc)
        status["running"] = False
        write_status(status)
        logger.exception("Pipeline failed")
        return 1
    finally:
        _release_lock()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--download-only", action="store_true")
    parser.add_argument("--embed-only", action="store_true")
    args = parser.parse_args()
    raise SystemExit(run_pipeline(download_only=args.download_only, embed_only=args.embed_only))
