"""Radio recommendation engine — weighted similarity + niche scoring + bridges."""

from __future__ import annotations

import logging
from typing import Any

from src.recommendation.bridge import find_bridges
from src.recommendation.catalog import get_track, library_tracks
from src.recommendation.catalog_filters import recommendable_tracks, track_dedupe_key
from src.recommendation.genre_buckets import pick_genre_diverse
from src.recommendation.scoring import (
    DISCOVERY_QUOTA,
    MIN_SIMILARITY,
    apply_obscurity_bonus,
    is_obscure,
    similarity_between_tracks,
)
from src.recommendation.session import save_radio_session
from src.recommendation.tree_builder import build_tree_chain, build_tree_graph
from src.recommendation.vectorize import to_feature_vector, user_weights_from_taste

logger = logging.getLogger("ultraviolet.engine")


def generate_radio(
    seed_track_id: str,
    *,
    count: int = 10,
    obscurity_dial: float = 0.5,
    user_weights: dict[str, float] | None = None,
) -> dict[str, Any]:
    seed = get_track(seed_track_id)
    if seed is None:
        raise KeyError(f"Unknown seed track: {seed_track_id}")

    catalog = recommendable_tracks(exclude_id=seed_track_id)
    weights = user_weights_from_taste(user_weights)
    seed_ids = seed["identifiers"]
    max_plays = max((int(t.get("popularity_score", 0)) for t in catalog), default=1)

    scored: list[dict[str, Any]] = []
    for track in catalog:
        if track["track_id"] == seed_track_id:
            continue
        sim = similarity_between_tracks(seed_ids, track["identifiers"], weights)
        if sim < MIN_SIMILARITY:
            continue
        popularity = int(track.get("popularity_score", 0))
        final = apply_obscurity_bonus(sim, popularity, max_plays, obscurity_dial)
        scored.append(
            {
                "track": track,
                "similarity": sim,
                "final_score": final,
                "recommendation_type": "direct",
            }
        )

    scored.sort(key=lambda item: item["final_score"], reverse=True)
    picked = pick_genre_diverse(scored, count)
    # Still apply discovery quota within genre-diverse picks
    picked = _apply_discovery_quota(picked, count)
    direct_flat: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for item in picked:
        key = track_dedupe_key(item["track"])
        if key in seen_keys:
            continue
        seen_keys.add(key)
        direct_flat.append(
            {
                "track_id": item["track"]["track_id"],
                "title": item["track"]["title"],
                "artist": item["track"]["artist"],
                "identifiers": item["track"]["identifiers"],
                "similarity": item["similarity"],
                "recommendation_type": item["recommendation_type"],
                "genre_bucket": item.get("genre_bucket"),
            }
        )
        if len(direct_flat) >= count:
            break

    bridges = find_bridges(
        seed_track_id,
        direct_flat,
        catalog,
        user_weights,
        limit=max(1, count // 4),
    )

    library = library_tracks()
    seed_meta = {"title": seed["title"], "artist": seed["artist"]}
    recommendations: list[dict[str, Any]] = []
    seen_rec: set[str] = set()
    for item in direct_flat[:count]:
        key = track_dedupe_key(item)
        if key in seen_rec:
            continue
        seen_rec.add(key)
        rec = {
            "track_id": item["track_id"],
            "title": item["title"],
            "artist": item["artist"],
            "confidence": round(item["similarity"], 3),
            "identifiers": item["identifiers"],
            "recommendation_type": item["recommendation_type"],
            "genre_bucket": item.get("genre_bucket"),
            "tree_chain": build_tree_chain(
                {"identifiers": item["identifiers"], "title": item["title"]},
                seed["identifiers"],
                user_weights,
                library_tracks=library,
                seed_meta=seed_meta,
            ),
        }
        recommendations.append(rec)

    for bridge in bridges:
        if len(recommendations) >= count:
            break
        if any(r["track_id"] == bridge["track_id"] for r in recommendations):
            continue
        key = track_dedupe_key(bridge)
        if key in seen_rec:
            continue
        seen_rec.add(key)
        rec = {
            "track_id": bridge["track_id"],
            "title": bridge["title"],
            "artist": bridge["artist"],
            "confidence": bridge["confidence"],
            "identifiers": bridge["identifiers"],
            "recommendation_type": "bridge",
            "bridge_via": bridge.get("bridge_via"),
            "tree_chain": build_tree_chain(
                {"identifiers": bridge["identifiers"], "title": bridge["title"]},
                seed["identifiers"],
                user_weights,
                library_tracks=library,
                seed_meta=seed_meta,
            ),
        }
        recommendations.append(rec)

    payload = {
        "seed": {
            "track_id": seed["track_id"],
            "title": seed["title"],
            "artist": seed["artist"],
            "play_count": seed.get("play_count", 0),
            "identifiers": seed["identifiers"],
        },
        "recommendations": recommendations,
        "library": library,
        "obscurity_dial": obscurity_dial,
    }
    save_radio_session(payload)
    payload["tree"] = build_tree_graph(payload)
    return payload


def build_tree_graph_for_session(session: dict[str, Any]) -> dict[str, Any]:
    if session.get("manual") and session.get("seeds"):
        from src.recommendation.manual_tree import build_multi_seed_tree

        return build_multi_seed_tree(session)
    return build_tree_graph(session)


def get_tree_for_recommendation(recommendation_id: str) -> dict[str, Any] | None:
    from src.recommendation.session import load_radio_session

    session = load_radio_session()
    if session is None:
        return None
    graph = build_tree_graph(session)
    nodes = [n for n in graph["nodes"] if n["id"] == recommendation_id]
    if not nodes:
        return None
    related_edges = [e for e in graph["edges"] if e["target"] == recommendation_id]
    related_nodes = {n["id"]: n for n in graph["nodes"]}
    node_ids = {recommendation_id}
    for edge in related_edges:
        node_ids.add(edge["source"])
    return {
        "nodes": [related_nodes[nid] for nid in node_ids if nid in related_nodes],
        "edges": related_edges,
    }


def get_full_tree() -> dict[str, Any]:
    from src.recommendation.session import load_radio_session

    session = load_radio_session()
    if session is None:
        return {"nodes": [], "edges": []}
    if session.get("manual") and session.get("seeds"):
        from src.recommendation.manual_tree import build_multi_seed_tree

        return build_multi_seed_tree(session)
    return build_tree_graph(session)


def _apply_discovery_quota(scored: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    if not scored:
        return []
    quota = max(1, int(count * DISCOVERY_QUOTA))
    obscure = [s for s in scored if is_obscure(int(s["track"].get("popularity_score", 0)))]
    mainstream = [s for s in scored if not is_obscure(int(s["track"].get("popularity_score", 0)))]

    picked: list[dict[str, Any]] = []
    picked.extend(obscure[:quota])
    for item in scored:
        if item in picked:
            continue
        picked.append(item)
        if len(picked) >= count:
            break
    for item in mainstream:
        if len(picked) >= count:
            break
        if item not in picked:
            picked.append(item)
    return picked
