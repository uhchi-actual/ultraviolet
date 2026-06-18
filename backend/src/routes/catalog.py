"""GET /api/catalog — list tracks in the recommendation pool."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/catalog")
async def catalog() -> dict:
    from src.recommendation.catalog import list_tracks

    tracks = list_tracks()
    return {
        "tracks": [
            {
                "track_id": t["track_id"],
                "title": t["title"],
                "artist": t["artist"],
                "popularity_score": t.get("popularity_score", 0),
                "play_count": t.get("play_count", 0),
                "source": t.get("source", "unknown"),
            }
            for t in tracks
        ]
    }
