"""Catalog helpers — filtering unnamed uploads and deduplicating recommendations."""

from __future__ import annotations

import re
from typing import Any

GENERIC_TITLES = frozenset(
    {
        "",
        "identified track",
        "captured audio",
        "upload",
        "listen",
        "unknown",
    }
)
GENERIC_ARTISTS = frozenset({"", "unknown", "unknown artist"})


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def is_named_track(track: dict[str, Any]) -> bool:
    """False for listen captures and other unnamed uploads."""
    title = _norm(track.get("title", ""))
    artist = _norm(track.get("artist", ""))
    if title in GENERIC_TITLES or title.startswith("listen-"):
        return False
    if title.startswith("track_"):
        return False
    if len(title) < 2:
        return False
    if artist in GENERIC_ARTISTS:
        return False
    return True


def track_dedupe_key(track: dict[str, Any]) -> str:
    return f"{_norm(track.get('artist', ''))}|{_norm(track.get('title', ''))}"


def recommendable_tracks(*, exclude_id: str | None = None) -> list[dict[str, Any]]:
    from src.recommendation.catalog import list_tracks

    out: list[dict[str, Any]] = []
    for track in list_tracks():
        if exclude_id and track.get("track_id") == exclude_id:
            continue
        if not is_named_track(track):
            continue
        out.append(track)
    return out


def has_user_library(tracks: list[dict[str, Any]] | None = None) -> bool:
    from src.recommendation.catalog import list_tracks

    pool = tracks if tracks is not None else list_tracks()
    return any(t.get("source") in ("spotify_history", "playlist_export") for t in pool)
