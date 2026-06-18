"""GET /api/tree/{id} and /api/tree/full — Tree provenance data."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter()


class ManualSong(BaseModel):
    title: str
    artist: str = ""


class ManualTreeRequest(BaseModel):
    songs: list[ManualSong] = Field(min_length=1, max_length=50)
    recs_per_seed: int = Field(default=12, ge=4, le=24)
    obscurity_dial: float = Field(default=0.5, ge=0.0, le=1.0)


@router.post("/tree/build")
async def tree_build(request: ManualTreeRequest) -> dict:
    from src.recommendation.manual_tree import build_manual_tree

    try:
        return build_manual_tree(
            [s.model_dump() for s in request.songs],
            recs_per_seed=request.recs_per_seed,
            obscurity_dial=request.obscurity_dial,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not build tree: {exc}",
        ) from exc


@router.get("/tree/full")
async def tree_full() -> dict:
    from src.recommendation.engine import get_full_tree

    return get_full_tree()


@router.get("/tree/{recommendation_id}")
async def tree(recommendation_id: str) -> dict:
    from src.recommendation.engine import get_tree_for_recommendation

    graph = get_tree_for_recommendation(recommendation_id)
    if graph is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Tree data for this recommendation. Run Radio mode first.",
        )
    return graph
