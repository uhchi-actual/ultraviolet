"""Recommendation scoring tests (Phase 1) — pure-Python math."""

import math

from src.recommendation.scoring import (
    apply_obscurity_bonus,
    cosine_similarity,
    is_obscure,
    weighted_similarity,
)


def test_cosine_identical_vectors():
    a = [0.5, 0.8, 0.2]
    assert math.isclose(cosine_similarity(a, a), 1.0, rel_tol=1e-9)


def test_cosine_orthogonal_vectors():
    assert math.isclose(cosine_similarity([1.0, 0.0], [0.0, 1.0]), 0.0, abs_tol=1e-9)


def test_weighted_similarity_runs():
    seed = [0.5, 0.5, 0.5]
    cand = [0.4, 0.6, 0.5]
    weights = [1.0, 2.0, 1.0]
    score = weighted_similarity(seed, cand, weights)
    assert 0.0 <= score <= 1.0


def test_obscurity_bonus_rewards_obscurity():
    base = 0.7
    obscure = apply_obscurity_bonus(base, track_play_count=10, max_play_count=100_000)
    mainstream = apply_obscurity_bonus(base, track_play_count=100_000, max_play_count=100_000)
    assert obscure > mainstream
    assert math.isclose(mainstream, base, rel_tol=1e-9)


def test_is_obscure():
    assert is_obscure(50) is True
    assert is_obscure(5000) is False
