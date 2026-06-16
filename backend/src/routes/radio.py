"""POST /api/radio — generate recommendations from a seed track (Phase 4)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter()


class RadioRequest(BaseModel):
    seed_track_id: str
    count: int = Field(default=10, ge=1, le=50)
    obscurity_dial: float = Field(default=0.5, ge=0.0, le=1.0)


@router.post("/radio")
async def radio(request: RadioRequest) -> dict:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Radio mode lands in Phase 4 (Conductor + recommendation engine).",
    )
