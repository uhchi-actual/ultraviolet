"""POST /api/search — fuzzy FMA catalog search with multi-driver scoring."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger("ultraviolet.search")


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    reference_track_id: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


@router.post("/search")
async def search_tracks(body: SearchRequest) -> dict[str, Any]:
    from src.catalog.fma import get_fma_track, search_fma
    from src.recommendation.catalog import get_track, list_tracks
    from src.recommendation.catalog_lookup import resolve_seed_from_catalog
    from src.scoring.ultraviolet_score import ultraviolet_score

    query = body.query.strip()
    hits = search_fma(query, limit=body.limit)

    reference: dict[str, Any] | None = None
    if body.reference_track_id:
        reference = get_track(body.reference_track_id) or get_fma_track(body.reference_track_id)
    if reference is None:
        try:
            parts = query.split(" - ", 1)
            if len(parts) == 2:
                reference = resolve_seed_from_catalog(parts[1].strip(), parts[0].strip())
            else:
                for t in list_tracks():
                    if query.lower() in f"{t.get('artist','')} {t.get('title','')}".lower():
                        reference = t
                        break
        except ValueError:
            reference = None

    results: list[dict[str, Any]] = []
    for track in hits:
        entry: dict[str, Any] = {
            "track_id": track.get("track_id"),
            "title": track.get("title"),
            "artist": track.get("artist"),
            "genre_top": track.get("genre_top", ""),
            "source": track.get("source", "fma"),
        }
        if reference:
            entry["ultraviolet_grade"] = ultraviolet_score(reference, track)
        results.append(entry)

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not in FMA catalog. Upload the audio file to analyze it.",
        )

    return {
        "query": query,
        "reference_track_id": reference.get("track_id") if reference else None,
        "results": results,
    }
