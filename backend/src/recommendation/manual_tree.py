"""Build a branching Tree from manually entered songs (up to 50).

Seeds resolve from the FMA catalog or CLAP text — no upload required.
"""

from __future__ import annotations

import logging
import random
import secrets
from typing import Any

from src.catalog.fma import get_fma_track, list_fma_tracks, recommendation_pool, search_fma
from src.recommendation.catalog import library_tracks, purge_demo_tracks, purge_junk_tracks
from src.recommendation.catalog_filters import recommendable_tracks, track_dedupe_key
from src.recommendation.catalog_lookup import resolve_seed_from_catalog
from src.recommendation.session import save_radio_session
from src.scoring.engine import recommend_branches
from src.recommendation.tree_builder import build_tree_chain
from src.recommendation.tree_depth import graph_node_id, tree_depth_config

logger = logging.getLogger("ultraviolet.manual_tree")


def _append_rec(
    all_recs: list[dict[str, Any]],
    *,
    track: dict[str, Any],
    similarity: float,
    seed: dict[str, Any],
    parent_id: str,
    depth: int,
    genre_bucket: str | None,
    library: list[dict[str, Any]],
    seen_keys: set[str],
    ultraviolet_grade: dict | None = None,
) -> bool:
    key = track_dedupe_key(track)
    if key in seen_keys:
        return False
    seen_keys.add(key)
    node_id = graph_node_id(track["track_id"], parent_id if depth > 1 else None)
    all_recs.append(
        {
            "graph_id": node_id,
            "track_id": track["track_id"],
            "title": track["title"],
            "artist": track["artist"],
            "confidence": round(similarity, 3),
            "identifiers": track["identifiers"],
            "recommendation_type": "direct" if depth == 1 else "branch",
            "genre_bucket": genre_bucket,
            "seed_track_id": seed["track_id"],
            "parent_id": parent_id,
            "depth": depth,
            "ultraviolet_grade": ultraviolet_grade,
            "tree_chain": build_tree_chain(
                {"identifiers": track["identifiers"], "title": track["title"]},
                seed["identifiers"],
                None,
                library_tracks=library,
                seed_meta={"title": seed["title"], "artist": seed["artist"]},
            ),
        }
    )
    return True


def build_manual_tree(
    songs: list[dict[str, str]],
    *,
    recs_per_seed: int | None = None,
    obscurity_dial: float = 0.5,
) -> dict[str, Any]:
    if not songs:
        raise ValueError("At least one song required")
    if len(songs) > 50:
        raise ValueError("Maximum 50 songs per tree")

    resolved: list[dict[str, Any]] = []
    for song in songs:
        title = song.get("title", "").strip()
        artist = song.get("artist", "").strip()
        if not title:
            continue
        resolved.append(resolve_seed_from_catalog(title, artist))

    if not resolved:
        raise ValueError("No songs could be resolved from catalog")

    l1_count, l2_count, l3_count = tree_depth_config(len(resolved))
    if recs_per_seed is not None:
        l1_count = max(recs_per_seed, l1_count)

    purge_junk_tracks()
    purge_demo_tracks()
    catalog = recommendation_pool()
    if len(catalog) < 2:
        catalog = list_fma_tracks()
    if len(catalog) < 2:
        raise ValueError(
            "FMA catalog not ready. Run: python scripts/build_fma_catalog.py "
            "after downloading fma_small.zip to D:/ultraviolet-data/fma/"
        )

    build_seed = secrets.randbelow(2**31)
    rng = random.Random(build_seed)
    library = library_tracks()
    exclude_keys: set[str] = set()
    exclude_track_ids: set[str] = {s["track_id"] for s in resolved}

    for s in resolved:
        exclude_keys.add(track_dedupe_key(s))

    all_recs: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for seed in resolved:
        l1_picks = recommend_branches(
            seed,
            catalog,
            count=l1_count,
            exclude_ids=exclude_track_ids,
            exclude_keys=exclude_keys,
            obscurity_dial=obscurity_dial,
            depth=1,
            rng=rng,
        )
        for item in l1_picks:
            track = item["track"]
            parent_seed_id = seed["track_id"]
            l1_node = graph_node_id(track["track_id"], None)
            if not _append_rec(
                all_recs,
                track=track,
                similarity=item["similarity"],
                seed=seed,
                parent_id=parent_seed_id,
                depth=1,
                genre_bucket=item.get("genre_bucket"),
                library=library,
                seen_keys=seen_keys,
                ultraviolet_grade=item.get("ultraviolet_grade"),
            ):
                continue
            exclude_keys.add(track_dedupe_key(track))
            exclude_track_ids.add(track["track_id"])

            l2_picks = recommend_branches(
                track,
                catalog,
                count=l2_count,
                exclude_ids=exclude_track_ids,
                exclude_keys=exclude_keys,
                obscurity_dial=obscurity_dial,
                depth=2,
                rng=rng,
            )
            for child in l2_picks:
                ct = child["track"]
                if not _append_rec(
                    all_recs,
                    track=ct,
                    similarity=child["similarity"],
                    seed=seed,
                    parent_id=l1_node,
                    depth=2,
                    genre_bucket=child.get("genre_bucket"),
                    library=library,
                    seen_keys=seen_keys,
                    ultraviolet_grade=child.get("ultraviolet_grade"),
                ):
                    continue
                exclude_keys.add(track_dedupe_key(ct))
                exclude_track_ids.add(ct["track_id"])
                l2_node = graph_node_id(ct["track_id"], l1_node)

                l3_picks = recommend_branches(
                    ct,
                    catalog,
                    count=l3_count,
                    exclude_ids=exclude_track_ids,
                    exclude_keys=exclude_keys,
                    obscurity_dial=obscurity_dial,
                    depth=3,
                    rng=rng,
                )
                for grand in l3_picks:
                    gt = grand["track"]
                    if _append_rec(
                        all_recs,
                        track=gt,
                        similarity=grand["similarity"],
                        seed=seed,
                        parent_id=l2_node,
                        depth=3,
                        genre_bucket=grand.get("genre_bucket"),
                        library=library,
                        seen_keys=seen_keys,
                        ultraviolet_grade=grand.get("ultraviolet_grade"),
                    ):
                        exclude_keys.add(track_dedupe_key(gt))
                        exclude_track_ids.add(gt["track_id"])

    if not all_recs:
        raise ValueError(
            "No branches matched your seeds. Try a different artist/title, lower obscurity, "
            "or wait for the FMA catalog to finish embedding."
        )

    primary = resolved[0]
    payload = {
        "seed": {
            "track_id": primary["track_id"],
            "title": primary["title"],
            "artist": primary["artist"],
            "identifiers": primary["identifiers"],
        },
        "seeds": resolved,
        "recommendations": all_recs,
        "library": library,
        "obscurity_dial": obscurity_dial,
        "manual": True,
    }
    save_radio_session(payload)
    payload["tree"] = build_multi_seed_tree(payload)
    payload["tree"]["layout_seed"] = build_seed
    logger.info("Built tree: %d seeds, %d branch nodes", len(resolved), len(all_recs))
    return payload


def build_multi_seed_tree(session: dict[str, Any]) -> dict[str, Any]:
    seeds = session.get("seeds") or [session.get("seed")]
    seeds = [s for s in seeds if s]
    recs = session.get("recommendations", [])
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    seen_nodes: set[str] = set()

    for seed in seeds:
        sid = seed["track_id"]
        if sid in seen_nodes:
            continue
        seen_nodes.add(sid)
        nodes.append(
            {
                "id": sid,
                "title": seed.get("title", ""),
                "artist": seed.get("artist", ""),
                "type": "seed",
                "genre_bucket": seed.get("genre_bucket"),
                "identifiers": seed.get("identifiers", {}),
            }
        )

    for rec in recs:
        gid = rec.get("graph_id") or rec["track_id"]
        if gid in seen_nodes:
            continue
        seen_nodes.add(gid)
        chain = rec.get("tree_chain", [])
        summary = chain[0]["explanation"] if chain else "Branches from shared sonic markers."
        nodes.append(
            {
                "id": gid,
                "title": rec["title"],
                "artist": rec["artist"],
                "type": "ai_recommendation",
                "confidence": rec.get("confidence", 0.0),
                "genre_bucket": rec.get("genre_bucket"),
                "why_summary": summary,
                "why_details": [link.get("explanation", "") for link in chain if link.get("explanation")],
                "identifiers": rec.get("identifiers", {}),
                "depth": rec.get("depth", 1),
            }
        )
        parent = rec.get("parent_id") or rec.get("seed_track_id")
        if parent:
            edges.append(
                {
                    "source": parent,
                    "target": gid,
                    "weight": rec.get("confidence", 0.5),
                    "kind": "trunk" if rec.get("depth", 1) == 1 else "branch",
                }
            )

    return {"nodes": nodes, "edges": edges}
