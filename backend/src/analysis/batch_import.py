"""Batch catalog import — scan a music folder and analyze each track with Demucs."""

from __future__ import annotations

import logging
import threading
import time
import uuid
from collections.abc import Callable, Iterator
from typing import Any

from src.analysis.metadata import extract_tags, scan_audio_files
from src.recommendation.catalog import catalog_size, purge_demo_tracks, upsert_track
from src.recommendation.catalog_filters import track_dedupe_key

logger = logging.getLogger("ultraviolet.batch_import")

_cancel_event = threading.Event()
_running = threading.Lock()


def request_cancel() -> None:
    _cancel_event.set()


def clear_cancel() -> None:
    _cancel_event.clear()


def is_cancelled() -> bool:
    return _cancel_event.is_set()


def rebuild_track_embeddings() -> int:
    """Upsert spectral embeddings into ChromaDB when available."""
    try:
        from src.db.chroma import TRACK_EMBEDDINGS, get_collection
        from src.recommendation.catalog import list_tracks

        collection = get_collection(TRACK_EMBEDDINGS)
        tracks = list_tracks()
        ids: list[str] = []
        embeddings: list[list[float]] = []
        documents: list[str] = []
        for track in tracks:
            emb = (track.get("identifiers") or {}).get("spectral_embedding") or []
            if len(emb) < 12:
                continue
            tid = track["track_id"]
            ids.append(tid)
            embeddings.append(emb)
            documents.append(f"{track.get('artist', '')} - {track.get('title', '')}")

        if not ids:
            return 0

        collection.upsert(ids=ids, embeddings=embeddings, documents=documents)
        logger.info("Rebuilt %d track embeddings in ChromaDB", len(ids))
        return len(ids)
    except Exception as exc:
        logger.warning("ChromaDB embedding rebuild skipped: %s", exc)
        return 0


def _existing_keys(skip_existing: bool) -> set[str]:
    if not skip_existing:
        return set()
    from src.recommendation.catalog import list_tracks

    return {track_dedupe_key(t) for t in list_tracks()}


def run_batch_import(
    directory: str,
    *,
    recursive: bool = True,
    skip_existing: bool = True,
    purge_demo: bool = True,
    on_progress: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    """Analyze every audio file in ``directory`` and add to the catalog."""
    if not _running.acquire(blocking=False):
        raise RuntimeError("A batch import is already running")

    started = time.monotonic()
    clear_cancel()
    errors: list[dict[str, str]] = []
    analyzed = 0
    skipped = 0

    try:
        if purge_demo:
            removed = purge_demo_tracks()
            if removed and on_progress:
                on_progress({"status": "purged_demo", "removed": removed})

        from src.utils.ollama_vram import unload_ollama_models

        unload_ollama_models()

        files = scan_audio_files(directory, recursive=recursive)
        total = len(files)
        existing = _existing_keys(skip_existing)

        if on_progress:
            on_progress(
                {
                    "status": "processing",
                    "total_files": total,
                    "completed": 0,
                    "skipped": 0,
                    "current_file": "",
                    "errors": [],
                }
            )

        from src.analysis.identifiers import analyze_from_file

        for path in files:
            if is_cancelled():
                break

            display = path.name
            if on_progress:
                on_progress(
                    {
                        "status": "processing",
                        "total_files": total,
                        "completed": analyzed,
                        "skipped": skipped,
                        "current_file": display,
                        "errors": errors[-5:],
                    }
                )

            artist, title = extract_tags(path)
            key = track_dedupe_key({"artist": artist, "title": title})
            if skip_existing and key in existing:
                skipped += 1
                continue

            track_id = f"batch_{uuid.uuid4().hex[:12]}"
            try:
                vector = analyze_from_file(str(path), track_id)
                upsert_track(
                    track_id,
                    title,
                    artist,
                    vector,
                    source="batch_import",
                )
                existing.add(key)
                analyzed += 1
            except Exception as exc:
                logger.exception("Batch analyze failed for %s", path)
                errors.append({"file": display, "error": str(exc).strip() or repr(exc)})

        embeddings = rebuild_track_embeddings()
        duration = time.monotonic() - started
        final = {
            "status": "cancelled" if is_cancelled() else "complete",
            "total_files": total,
            "total_analyzed": analyzed,
            "skipped": skipped,
            "catalog_size": catalog_size(),
            "embeddings_rebuilt": embeddings,
            "duration_seconds": round(duration, 1),
            "errors": errors,
        }
        if on_progress:
            on_progress(final)
        return final
    finally:
        _running.release()


def iter_batch_events(
    directory: str,
    *,
    recursive: bool = True,
    skip_existing: bool = True,
    purge_demo: bool = True,
) -> Iterator[dict[str, Any]]:
    """Yield progress dicts for SSE streaming."""
    events: list[dict[str, Any]] = []

    def capture(event: dict[str, Any]) -> None:
        events.append(event)

    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(
            run_batch_import,
            directory,
            recursive=recursive,
            skip_existing=skip_existing,
            purge_demo=purge_demo,
            on_progress=capture,
        )
        sent = 0
        while not future.done():
            while sent < len(events):
                yield events[sent]
                sent += 1
            time.sleep(0.25)
        while sent < len(events):
            yield events[sent]
            sent += 1
        try:
            result = future.result()
            if not events or events[-1] != result:
                yield result
        except Exception as exc:
            yield {"status": "error", "message": str(exc)}
