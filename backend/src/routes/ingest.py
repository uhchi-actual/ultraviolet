"""POST /api/ingest — ingest personal data for SOUL (Phase 3)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from src.agents.soul import Soul

router = APIRouter()
soul = Soul()

# Spotify extended-history exports can be sizable; allow up to 256 MB.
_MAX_BYTES = 256 * 1024 * 1024
_DATA_TYPES = {"spotify_history", "playlist_export", "personal_text"}


@router.post("/ingest")
async def ingest(
    file: Annotated[UploadFile, File()],
    data_type: Annotated[str, Form()] = "spotify_history",
) -> dict:
    if data_type not in _DATA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown data_type. Use one of: {', '.join(sorted(_DATA_TYPES))}.",
        )

    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large (256 MB max).",
        )
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file.")

    try:
        return await soul.ingest(data, data_type)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except Exception as exc:  # noqa: BLE001 — surface a clean 500 on infra failure
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {exc}",
        ) from exc
