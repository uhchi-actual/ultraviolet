"""POST /api/analyze — upload an audio file and get its Demucs-backed fingerprint."""

from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

router = APIRouter()
logger = logging.getLogger("ultraviolet.analyze")

# Guard against oversized uploads (50 MB).
_MAX_BYTES = 50 * 1024 * 1024


@router.post("/analyze")
async def analyze(
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form()] = None,
    artist: Annotated[str | None, Form()] = None,
) -> dict:
    from src.analysis.identifiers import analyze_track
    from src.utils.audio_io import downsample_waveform, is_supported_format, load_audio

    filename = file.filename or "upload"
    if not is_supported_format(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Use MP3, FLAC, WAV, OGG, M4A, or WebM.",
        )

    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large (50 MB max).",
        )

    suffix = Path(filename).suffix or ".wav"
    tmp_path = ""
    track_id = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        track_id = f"track_{uuid.uuid4().hex[:12]}"
        from src.utils.ollama_vram import unload_ollama_models

        unload_ollama_models()
        vector = await analyze_track(tmp_path, track_id)
        # Waveform preview — librosa only (never torchaudio/torchcodec).
        y, _ = await asyncio.to_thread(load_audio, tmp_path, 22050)
        waveform = downsample_waveform(y)

        from src.recommendation.catalog import upsert_track
        from src.scoring.clap_driver import embed_audio_file

        stem = Path(filename).stem
        catalog_title = title or ("" if stem.startswith(("listen-", "track_")) else stem)
        clap_embedding = await asyncio.to_thread(embed_audio_file, tmp_path)
        upsert_track(
            track_id,
            catalog_title or "Identified track",
            artist or "",
            vector,
            source="user_upload",
            clap_embedding=clap_embedding,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface a clean 422 for bad audio
        msg = str(exc).strip() or repr(exc)
        logger.exception("Analyze failed for %s", filename)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not analyze audio: {msg}",
        ) from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    stem = Path(filename).stem
    display_title = title or ("" if stem.startswith(("listen-", "track_")) else stem)

    return {
        "track_id": track_id,
        "title": display_title,
        "artist": artist or None,
        "identifiers": vector.model_dump(),
        "waveform_data": waveform,
    }
