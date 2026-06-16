"""SOUL agent tests (Phase 1) — neutral weights before any ingestion."""

import asyncio

from src.agents.soul import Soul
from src.models.identifiers import UserTasteVector


def test_default_weights_are_neutral():
    weights = asyncio.run(Soul().get_user_weights())
    assert isinstance(weights, UserTasteVector)
    values = weights.model_dump().values()
    assert all(v == 1.0 for v in values)
