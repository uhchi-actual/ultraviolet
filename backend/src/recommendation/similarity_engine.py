"""Multi-driver recommender — delegates to scoring.engine."""

from __future__ import annotations

from src.scoring.engine import pick_mmr_diverse, recommend_branches, score_catalog

__all__ = ["score_catalog", "pick_mmr_diverse", "recommend_branches"]
