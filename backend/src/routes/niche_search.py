"""POST /api/niche-search — identify tracks via Spotify, YouTube, SoundCloud."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.models.identifiers import IdentifierVector

router = APIRouter()


class NicheSearchRequest(BaseModel):
    track_id: str | None = None
    title: str | None = None
    artist: str | None = None
    identifiers: IdentifierVector


@router.post("/niche-search")
async def niche_search(body: NicheSearchRequest) -> dict:
    from src.identification.niche_search import run_niche_search

    try:
        return await run_niche_search(
            body.identifiers,
            title=body.title,
            artist=body.artist,
            track_id=body.track_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NicheSearch failed: {exc}",
        ) from exc
