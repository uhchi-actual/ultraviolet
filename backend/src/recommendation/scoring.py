"""Weighted similarity + niche scoring.

These are pure-Python (stdlib ``math`` only) so they are fully testable without
numpy or the audio stack. Used by the Conductor in Phase 4.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

# ── Niche discovery tuning ──
DISCOVERY_QUOTA = 0.35  # 35% of a batch must come from obscure artists
OBSCURITY_THRESHOLD = 1000  # monthly play-count threshold for "obscure"
MIN_SIMILARITY = 0.6  # minimum similarity to be recommended at all


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    if len(a) != len(b):
        raise ValueError("Vectors must have the same length")
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def weighted_cosine_similarity(
    vec_a: Sequence[float],
    vec_b: Sequence[float],
    weights: Sequence[float],
) -> float:
    """Weighted cosine similarity (Adiyansjah et al. 2019; McFee & Lanckriet)."""
    weighted_a = [v * w for v, w in zip(vec_a, weights, strict=True)]
    weighted_b = [v * w for v, w in zip(vec_b, weights, strict=True)]
    return cosine_similarity(weighted_a, weighted_b)


def weighted_similarity(
    seed_vector: Sequence[float],
    candidate_vector: Sequence[float],
    user_weights: Sequence[float],
) -> float:
    """Alias for weighted_cosine_similarity."""
    return weighted_cosine_similarity(seed_vector, candidate_vector, user_weights)


def similarity_between_tracks(
    seed: object,
    candidate: object,
    user_weights: Sequence[float] | None = None,
) -> float:
    """Preferred path: perceptual similarity on full IdentifierVector payloads."""
    from src.recommendation.perceptual_distance import perceptual_similarity

    return perceptual_similarity(seed, candidate, user_weights)


def apply_obscurity_bonus(
    similarity_score: float,
    track_play_count: int,
    max_play_count: int,
    obscurity_dial: float = 0.5,
) -> float:
    """Reward obscurity so lesser-known artists surface.

    ``obscurity_dial``: 0.0 = no bonus (mainstream only), 1.0 = maximum obscurity.
    """
    if max_play_count <= 0:
        return similarity_score
    obscurity_factor = obscurity_dial * math.log(max_play_count / max(track_play_count, 1))
    return similarity_score * (1 + obscurity_factor)


def is_obscure(play_count: int, threshold: int = OBSCURITY_THRESHOLD) -> bool:
    return play_count < threshold
