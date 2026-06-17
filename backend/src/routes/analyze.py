"""POST /api/analyze — upload an audio file and get its Demucs-backed fingerprint."""

from __future__ import annotations

import asyncio
import os
import tempfile
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

router = APIRouter()

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
            detail="Unsupported format. Use MP3, FLAC, WAV, OGG, or M4A.",
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
        vector = await analyze_track(tmp_path, track_id)
        y, _ = await asyncio.to_thread(load_audio, tmp_path)
        waveform = downsample_waveform(y)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface a clean 422 for bad audio
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not analyze audio: {exc}",
        ) from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return {
        "track_id": track_id,
        "title": title or Path(filename).stem,
        "artist": artist,
        "identifiers": vector.model_dump(),
        "waveform_data": waveform,
    }
