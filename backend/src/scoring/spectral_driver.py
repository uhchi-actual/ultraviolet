"""Spectral fingerprint driver — weighted cosine on librosa / FMA features."""

from __future__ import annotations

from typing import Any

from src.recommendation.perceptual_distance import perceptual_similarity
from src.recommendation.vectorize import user_weights_from_taste


def spectral_similarity(
    features_a: dict[str, Any],
    features_b: dict[str, Any],
    user_weights: dict[str, float] | None = None,
) -> float:
    """Weighted cosine / perceptual similarity on identifier feature vectors."""
    weights = user_weights_from_taste(user_weights)
    return perceptual_similarity(features_a, features_b, weights)
