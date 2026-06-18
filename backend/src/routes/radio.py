"""POST /api/radio — generate recommendations from a seed track."""

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
    from src.agents.soul import Soul
    from src.recommendation.engine import generate_radio

    taste = None
    try:
        profile = await Soul().get_profile()
        taste = profile["taste_vector"] if profile else None
    except Exception:  # noqa: BLE001 — radio works without PostgreSQL profile
        taste = None

    try:
        return generate_radio(
            request.seed_track_id,
            count=request.count,
            obscurity_dial=request.obscurity_dial,
            user_weights=taste,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not generate recommendations: {exc}",
        ) from exc
