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


def weighted_similarity(
    seed_vector: Sequence[float],
    candidate_vector: Sequence[float],
    user_weights: Sequence[float],
) -> float:
    """Weighted cosine similarity, biased by the user's identifier preferences."""
    weighted_seed = [v * w for v, w in zip(seed_vector, user_weights, strict=True)]
    weighted_candidate = [v * w for v, w in zip(candidate_vector, user_weights, strict=True)]
    return cosine_similarity(weighted_seed, weighted_candidate)


def apply_obscurity_bonus(
    similarity_score: float,
    track_play_count: int,
    max_play_count: int,
    obscurity_dial: float = 0.5,
) -> float:
    """Reward obscurity so lesser-known artists surface.

    ``obscurity_dial``: 0.0 = no bonus (mainstream only), 1.0 = maximum obscurity.
    """
    obscurity_factor = obscurity_dial * math.log(max_play_count / max(track_play_count, 1))
    return similarity_score * (1 + obscurity_factor)


def is_obscure(play_count: int, threshold: int = OBSCURITY_THRESHOLD) -> bool:
    return play_count < threshold
