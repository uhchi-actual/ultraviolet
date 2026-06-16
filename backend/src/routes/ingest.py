"""POST /api/ingest — ingest personal data for SOUL (Phase 3)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

router = APIRouter()


@router.post("/ingest")
async def ingest(
    file: Annotated[UploadFile, File()],
    data_type: Annotated[str, Form()] = "spotify_history",
) -> dict:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Personal-data ingestion lands in Phase 3 (SOUL agent + RAG).",
    )
