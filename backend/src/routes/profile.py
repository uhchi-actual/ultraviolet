"""GET /api/profile — SOUL user profile data (Phase 3)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from src.agents.soul import Soul

router = APIRouter()
soul = Soul()


@router.get("/profile")
async def profile() -> dict:
    try:
        data = await soul.get_profile()
    except Exception as exc:  # noqa: BLE001 — DB unavailable, etc.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Profile store unavailable: {exc}",
        ) from exc

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile yet — ingest your listening data first.",
        )
    return data
