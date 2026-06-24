"""Perceptually motivated music similarity — no external APIs.

Core: weighted cosine similarity of identifier feature vectors
(Adiyansjah et al. 2019; McFee & Lanckriet IEEE TASLP).

Specialized components:
- Circle-of-fifths key distance (Krumhansl–Schmuckler lineage)
- Ratio-based tempo similarity (half/double-time aware)
- Cosine similarity on CQT chroma+MFCC embeddings when present
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from src.models.identifiers import IdentifierVector
from src.recommendation.scoring import weighted_cosine_similarity
from src.recommendation.vectorize import FEATURE_KEYS, to_feature_vector

# Circle-of-fifths order mapped to semitones: C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F
_FIFTHS_POSITION = (0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5)

# Blend weight for spectral embedding vs scalar features
_EMBED_BLEND = 0.32

_TEMPO_SIGMA = 0.1


def circle_of_fifths_distance(key_a: int, mode_a: int, key_b: int, mode_b: int) -> float:
    """0 = identical key/mode, 1 = maximally distant on the circle."""
    if key_a == key_b and mode_a == mode_b:
        return 0.0
    rel_a = (key_a + 3) % 12 if mode_a == 0 else (key_a - 3) % 12
    rel_b = (key_b + 3) % 12 if mode_b == 0 else (key_b - 3) % 12
    if key_a == rel_b or key_b == rel_a:
        return 0.12
    if mode_a == mode_b:
        pos_a = _FIFTHS_POSITION.index(key_a % 12)
        pos_b = _FIFTHS_POSITION.index(key_b % 12)
        raw_dist = abs(pos_a - pos_b)
        circular_dist = min(raw_dist, 12 - raw_dist)
        return circular_dist / 6.0
    return 0.55


def key_similarity(key_a: int, mode_a: int, key_b: int, mode_b: int) -> float:
    return 1.0 - circle_of_fifths_distance(key_a, mode_a, key_b, mode_b)


def tempo_similarity(bpm_a: float, bpm_b: float) -> float:
    """Ratio-based tempo match — half-time and double-time treated as related."""
    if bpm_a <= 0 or bpm_b <= 0:
        return 0.0
    ratio = bpm_a / bpm_b
    candidates = [ratio, ratio * 2, ratio / 2]
    best = min(abs(c - 1.0) for c in candidates)
    return math.exp(-(best**2) / (2 * _TEMPO_SIGMA**2))


def spectral_cosine(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    return max(0.0, min(1.0, dot))


def _normalize_weights(weights: Sequence[float], length: int) -> list[float]:
    if not weights or len(weights) != length:
        return [1.0] * length
    return list(weights)


def perceptual_similarity(
    seed: IdentifierVector | dict,
    candidate: IdentifierVector | dict,
    user_weights: Sequence[float] | None = None,
) -> float:
    """Weighted cosine similarity with perceptual key/tempo components in [0, 1]."""
    if isinstance(seed, dict):
        seed = IdentifierVector.model_validate(seed)
    if isinstance(candidate, dict):
        candidate = IdentifierVector.model_validate(candidate)

    weights = _normalize_weights(user_weights or [], len(FEATURE_KEYS))
    s_vec = to_feature_vector(seed)
    c_vec = to_feature_vector(candidate)

    tempo_sim = tempo_similarity(seed.tempo, candidate.tempo)
    key_sim = key_similarity(seed.key, seed.mode, candidate.key, candidate.mode)

    # Weighted cosine on timbral/scalar features (mode onward).
    rest_weights = weights[2:] if len(weights) > 2 else [1.0] * (len(s_vec) - 2)
    rest_sim = weighted_cosine_similarity(s_vec[2:], c_vec[2:], rest_weights)

    weight_total = weights[0] + weights[1] + sum(rest_weights)
    scalar_sim = (
        weights[0] * tempo_sim + weights[1] * key_sim + sum(rest_weights) * rest_sim
    ) / max(weight_total, 1e-9)

    emb_a = seed.spectral_embedding
    emb_b = candidate.spectral_embedding
    if len(emb_a) >= 12 and len(emb_b) >= 12 and len(emb_a) == len(emb_b):
        embed_sim = spectral_cosine(emb_a, emb_b)
        return (1.0 - _EMBED_BLEND) * scalar_sim + _EMBED_BLEND * embed_sim

    return scalar_sim
