"""Multi-driver recommender — Ultraviolet Grade ensemble + MMR diversity."""

from __future__ import annotations

import random
from typing import Any

from src.recommendation.genre_buckets import infer_genre_bucket, pick_genre_diverse
from src.recommendation.scoring import MIN_SIMILARITY, apply_obscurity_bonus
from src.scoring.ultraviolet_score import UserProfile, ultraviolet_score


def _effective_min_score(catalog_size: int, depth: int) -> float:
    floor = MIN_SIMILARITY * 0.65
    if catalog_size > 1000:
        floor = 0.45
    return max(0.35, floor - depth * 0.02)


def score_catalog(
    parent: dict[str, Any],
    catalog: list[dict[str, Any]],
    *,
    exclude_ids: set[str],
    exclude_keys: set[str],
    obscurity_dial: float,
    depth: int,
    user_profile: UserProfile | None = None,
    run_stem_for_top: int = 0,
) -> list[dict[str, Any]]:
    """Score catalog tracks against parent using 4-driver Ultraviolet Grade."""
    from src.recommendation.catalog_filters import track_dedupe_key

    parent_id = parent.get("track_id", "")
    profile = user_profile or UserProfile()
    min_score = _effective_min_score(len(catalog), depth)
    max_plays = max((int(t.get("popularity_score", 0)) for t in catalog), default=1)
    scored: list[dict[str, Any]] = []

    for track in catalog:
        tid = track["track_id"]
        if tid in exclude_ids or tid == parent_id:
            continue
        key = track_dedupe_key(track)
        if key in exclude_keys:
            continue

        grade = ultraviolet_score(parent, track, profile)
        sim = grade["score"]
        if sim < min_score:
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
                "ultraviolet_grade": grade,
            }
        )

    scored.sort(key=lambda x: x["final_score"], reverse=True)

    if run_stem_for_top > 0 and scored:
        stem_profile = UserProfile(
            driver_weights=profile.driver_weights,
            stem_weights=profile.stem_weights,
            feature_weights=profile.feature_weights,
            run_stem=True,
        )
        for item in scored[:run_stem_for_top]:
            grade = ultraviolet_score(parent, item["track"], stem_profile)
            item["ultraviolet_grade"] = grade
            item["similarity"] = grade["score"]
            item["final_score"] = grade["score"]

        scored.sort(key=lambda x: x["final_score"], reverse=True)

    return scored


def pick_mmr_diverse(
    scored: list[dict[str, Any]],
    count: int,
    rng: random.Random,
    *,
    lambda_: float = 0.7,
    parent: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """MMR reranking using Ultraviolet Grade scores (Carbonell & Goldstein 1998)."""
    if not scored or count <= 0:
        return []

    pool = [{**item, "final_score": item["final_score"] + rng.uniform(0, 0.05)} for item in scored]
    pool.sort(key=lambda x: x["final_score"], reverse=True)

    picked: list[dict[str, Any]] = [pool.pop(0)]
    while len(picked) < count and pool:
        best_idx = 0
        best_mmr = float("-inf")
        for i, cand in enumerate(pool):
            max_redundancy = 0.0
            for prev in picked:
                grade = ultraviolet_score(cand["track"], prev["track"])
                max_redundancy = max(max_redundancy, grade["score"])
            mmr = lambda_ * cand["similarity"] - (1.0 - lambda_) * max_redundancy
            mmr += rng.uniform(0, 0.03)
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
    user_profile: UserProfile | None = None,
    run_stem_for_top: int = 3,
) -> list[dict[str, Any]]:
    """Pick tree branches via multi-driver scoring + genre diversity + MMR."""
    scored = score_catalog(
        parent,
        catalog,
        exclude_ids=exclude_ids,
        exclude_keys=exclude_keys,
        obscurity_dial=obscurity_dial,
        depth=depth,
        user_profile=user_profile,
        run_stem_for_top=run_stem_for_top if depth == 1 else 0,
    )
    if not scored:
        return []

    genre_picks = pick_genre_diverse(scored, min(count, max(4, count // 2)))
    genre_ids = {p["track"]["track_id"] for p in genre_picks}
    remainder = [s for s in scored if s["track"]["track_id"] not in genre_ids]
    mmr_picks = pick_mmr_diverse(remainder, count - len(genre_picks), rng, parent=parent)

    merged = genre_picks + mmr_picks
    rng.shuffle(merged)
    merged.sort(key=lambda x: x["final_score"], reverse=True)
    return merged[:count]
