"""GET /api/tree/{id} and /api/tree/full — Tree provenance data (Phase 4)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/tree/full")
async def tree_full() -> dict:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="The Tree graph lands in Phase 4 (Conductor + Tree builder).",
    )


@router.get("/tree/{recommendation_id}")
async def tree(recommendation_id: str) -> dict:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Tree provenance lands in Phase 4 (Conductor + Tree builder).",
    )
