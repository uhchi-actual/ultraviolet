"""POST /api/analyze — upload + analyze an audio file (Phase 2)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

router = APIRouter()


@router.post("/analyze")
async def analyze(
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form()] = None,
    artist: Annotated[str | None, Form()] = None,
) -> dict:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Audio analysis (the 15 identifiers) lands in Phase 2 (DJ agent).",
    )
