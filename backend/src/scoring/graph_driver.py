"""Genre graph driver — hierarchical distance on FMA 161-genre taxonomy."""

from __future__ import annotations

import ast
import csv
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.config import settings

logger = logging.getLogger("ultraviolet.graph_driver")

# FMA genre proximity scores (Defferrard et al. 2017 hierarchy).
_SAME_GENRE = 1.0
_SAME_PARENT = 0.7
_SAME_GRANDPARENT = 0.4
_SAME_TOP = 0.25
_UNRELATED = 0.1


@lru_cache(maxsize=1)
def _load_genre_tree() -> tuple[dict[int, dict[str, Any]], dict[int, set[int]]]:
    """Return genre_id -> {title, parent_id, top_level} and parent->children map."""
    genres_path = Path(settings.fma_dir) / "fma_metadata" / "genres.csv"
    if not genres_path.exists():
        genres_path = Path(settings.fma_dir) / "genres.csv"
    genres: dict[int, dict[str, Any]] = {}
    if not genres_path.exists():
        logger.warning("FMA genres.csv not found at %s", genres_path)
        return {}, {}

    with genres_path.open(encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            gid = int(row["genre_id"])
            parent = row.get("parent_id", "")
            genres[gid] = {
                "title": row.get("title", ""),
                "parent_id": int(parent) if parent and parent != "0" else None,
                "top_level": row.get("top_level", ""),
            }

    children: dict[int, set[int]] = {}
    for gid, meta in genres.items():
        pid = meta["parent_id"]
        if pid is not None:
            children.setdefault(pid, set()).add(gid)
    return genres, children


def _parse_genre_ids(track: dict[str, Any]) -> list[int]:
    raw = track.get("genres") or track.get("genre_ids") or []
    if isinstance(raw, str):
        try:
            raw = ast.literal_eval(raw)
        except (ValueError, SyntaxError):
            raw = [int(x) for x in raw.strip("[]").split(",") if x.strip().isdigit()]
    if isinstance(raw, int):
        return [raw]
    return [int(g) for g in raw if g is not None]


def _ancestors(genre_id: int, tree: dict[int, dict[str, Any]]) -> list[int]:
    chain = [genre_id]
    current = genre_id
    seen = {genre_id}
    while True:
        parent = tree.get(current, {}).get("parent_id")
        if parent is None or parent in seen:
            break
        chain.append(parent)
        seen.add(parent)
        current = parent
    return chain


def genre_graph_score(
    track_a: dict[str, Any],
    track_b: dict[str, Any],
) -> float:
    """Best pairwise score across genre tags using tree distance."""
    tree, _ = _load_genre_tree()
    if not tree:
        ga = track_a.get("genre_top") or track_a.get("genre_bucket") or ""
        gb = track_b.get("genre_top") or track_b.get("genre_bucket") or ""
        if ga and gb and ga == gb:
            return _SAME_PARENT
        return _UNRELATED

    ids_a = _parse_genre_ids(track_a)
    ids_b = _parse_genre_ids(track_b)
    if not ids_a or not ids_b:
        return _UNRELATED

    best = _UNRELATED
    for ga in ids_a:
        chain_a = _ancestors(ga, tree)
        for gb in ids_b:
            if ga == gb:
                return _SAME_GENRE
            chain_b = set(_ancestors(gb, tree))
            for depth, ancestor in enumerate(chain_a[1:], start=1):
                if ancestor in chain_b:
                    if depth == 1:
                        best = max(best, _SAME_PARENT)
                    elif depth == 2:
                        best = max(best, _SAME_GRANDPARENT)
                    else:
                        best = max(best, _SAME_TOP)
                    break
    return best
