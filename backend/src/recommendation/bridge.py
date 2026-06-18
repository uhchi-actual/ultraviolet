"""Bridge recommendations — secondary-hop discovery from top direct matches."""

from __future__ import annotations

from src.recommendation.perceptual_distance import perceptual_similarity
from src.recommendation.vectorize import user_weights_from_taste


def find_bridges(
    seed_track_id: str,
    direct_matches: list[dict],
    catalog: list[dict],
    user_weights: dict | None,
    *,
    hops: int = 2,
    limit: int = 3,
) -> list[dict]:
    """Find candidates similar to top direct matches but not the seed."""
    if hops < 1 or not direct_matches:
        return []

    weights = user_weights_from_taste(user_weights)
    if not any(t["track_id"] == seed_track_id for t in catalog):
        return []

    used_ids = {seed_track_id, *(m["track_id"] for m in direct_matches)}
    bridges: list[dict] = []

    for hop_source in direct_matches[:5]:
        scored: list[tuple[float, dict]] = []
        for track in catalog:
            tid = track["track_id"]
            if tid in used_ids:
                continue
            sim = perceptual_similarity(hop_source["identifiers"], track["identifiers"], weights)
            scored.append((sim, track))
        scored.sort(key=lambda item: item[0], reverse=True)
        for sim, track in scored[:2]:
            if sim < 0.55:
                continue
            bridges.append(
                {
                    **track,
                    "confidence": round(sim, 3),
                    "recommendation_type": "bridge",
                    "bridge_via": {
                        "track_id": hop_source["track_id"],
                        "title": hop_source["title"],
                        "artist": hop_source["artist"],
                    },
                }
            )
            used_ids.add(track["track_id"])
            if len(bridges) >= limit:
                return bridges
    return bridges
