"""GET /api/profile — SOUL user profile data (Phase 3)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/profile")
async def profile() -> dict:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="User profiling lands in Phase 3 (SOUL agent + RAG).",
    )
