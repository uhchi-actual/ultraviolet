"""In-house recommender — weighted vector similarity + MMR diversity + stochastic emergence.

Uses Ultraviolet IdentifierVectors (Demucs stems + librosa features). No external
recommendation APIs.
"""

from __future__ import annotations

import random
from typing import Any

from src.recommendation.genre_buckets import infer_genre_bucket, pick_genre_diverse
from src.recommendation.perceptual_distance import perceptual_similarity
from src.recommendation.scoring import MIN_SIMILARITY, apply_obscurity_bonus
from src.recommendation.vectorize import user_weights_from_taste


def _effective_min_similarity(catalog_size: int, depth: int) -> float:
    """Relax threshold when the catalog is small so trees still branch."""
    floor = MIN_SIMILARITY * 0.72
    if catalog_size < 40:
        floor *= 0.82
    if catalog_size < 15:
        floor *= 0.88
    return max(0.38, floor - depth * 0.025)


def score_catalog(
    parent: dict[str, Any],
    catalog: list[dict[str, Any]],
    *,
    exclude_ids: set[str],
    exclude_keys: set[str],
    obscurity_dial: float,
    depth: int,
    user_weights: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Score every catalog track against a parent seed by sonic fingerprint."""
    from src.recommendation.catalog_filters import track_dedupe_key

    parent_id = parent.get("track_id", "")
    weights = user_weights_from_taste(user_weights)
    min_sim = _effective_min_similarity(len(catalog), depth)
    max_plays = max((int(t.get("popularity_score", 0)) for t in catalog), default=1)
    scored: list[dict[str, Any]] = []

    for track in catalog:
        tid = track["track_id"]
        if tid in exclude_ids or tid == parent_id:
            continue
        key = track_dedupe_key(track)
        if key in exclude_keys:
            continue
        sim = perceptual_similarity(parent["identifiers"], track["identifiers"], weights)
        if sim < min_sim:
            continue
        popularity = int(track.get("popularity_score", 0))
        final = apply_obscurity_bonus(sim, popularity, max_plays, obscurity_dial)
        bucket = track.get("genre_bucket") or infer_genre_bucket(track)
        scored.append(
            {
                "track": track,
                "similarity": sim,
                "final_score": final,
                "genre_bucket": bucket,
            }
        )

    scored.sort(key=lambda x: x["final_score"], reverse=True)
    return scored


def pick_mmr_diverse(
    scored: list[dict[str, Any]],
    count: int,
    rng: random.Random,
    *,
    lambda_: float = 0.7,
    user_weights: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Maximal Marginal Relevance — sonically relevant but not redundant."""
    if not scored or count <= 0:
        return []

    weights = user_weights_from_taste(user_weights)
    pool = [
        {**item, "final_score": item["final_score"] + rng.uniform(0, 0.07)}
        for item in scored
    ]
    pool.sort(key=lambda x: x["final_score"], reverse=True)

    picked: list[dict[str, Any]] = [pool.pop(0)]
    while len(picked) < count and pool:
        best_idx = 0
        best_mmr = float("-inf")
        for i, cand in enumerate(pool):
            max_redundancy = 0.0
            for prev in picked:
                max_redundancy = max(
                    max_redundancy,
                    perceptual_similarity(
                        cand["track"]["identifiers"],
                        prev["track"]["identifiers"],
                        weights,
                    ),
                )
            mmr = lambda_ * cand["similarity"] - (1.0 - lambda_) * max_redundancy
            mmr += rng.uniform(0, 0.05)
            if mmr > best_mmr:
                best_mmr = mmr
                best_idx = i
        picked.append(pool.pop(best_idx))
    return picked


def recommend_branches(
    parent: dict[str, Any],
    catalog: list[dict[str, Any]],
    *,
    count: int,
    exclude_ids: set[str],
    exclude_keys: set[str],
    obscurity_dial: float,
    depth: int,
    rng: random.Random,
    user_weights: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Pick the next tree branch layer using in-house sonic similarity."""
    scored = score_catalog(
        parent,
        catalog,
        exclude_ids=exclude_ids,
        exclude_keys=exclude_keys,
        obscurity_dial=obscurity_dial,
        depth=depth,
        user_weights=user_weights,
    )
    if not scored:
        return []

    # Genre round-robin first, then MMR for emergence within the scored pool
    genre_picks = pick_genre_diverse(scored, min(count, max(4, count // 2)))
    genre_ids = {p["track"]["track_id"] for p in genre_picks}
    remainder = [s for s in scored if s["track"]["track_id"] not in genre_ids]
    mmr_picks = pick_mmr_diverse(remainder, count - len(genre_picks), rng, user_weights=user_weights)

    merged = genre_picks + mmr_picks
    rng.shuffle(merged)
    merged.sort(key=lambda x: x["final_score"], reverse=True)
    return merged[:count]
