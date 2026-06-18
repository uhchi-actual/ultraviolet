"""Resolve manual tree seeds from the local analyzed catalog — no streaming APIs."""

from __future__ import annotations

import re
from typing import Any

from src.recommendation.catalog import list_tracks
from src.recommendation.catalog_filters import is_named_track


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _match_score(title: str, artist: str, track: dict[str, Any]) -> float:
    t_in = _norm(title)
    a_in = _norm(artist)
    t_cat = _norm(track.get("title", ""))
    a_cat = _norm(track.get("artist", ""))
    if not t_in:
        return 0.0

    score = 0.0
    if t_in == t_cat:
        score += 4.0
    elif t_in in t_cat or t_cat in t_in:
        score += 2.5
    else:
        for word in t_in.split():
            if len(word) > 3 and word in t_cat:
                score += 0.6

    if a_in:
        if a_in == a_cat:
            score += 4.0
        elif a_in in a_cat or a_cat in a_in:
            score += 2.5
        else:
            for word in a_in.split():
                if len(word) > 2 and word in a_cat:
                    score += 0.5
    elif score >= 2.5:
        score += 0.5

    return score


def resolve_seed_from_catalog(title: str, artist: str = "") -> dict[str, Any]:
    """Find a seed track by title/artist in the local fingerprint catalog."""
    title = title.strip()
    artist = artist.strip()
    if not title:
        raise ValueError("Song title is required")

    candidates: list[tuple[float, dict[str, Any]]] = []
    for track in list_tracks():
        if not is_named_track(track):
            continue
        score = _match_score(title, artist, track)
        if score >= 2.5:
            candidates.append((score, track))

    if not candidates:
        raise ValueError(
            f"'{title}'"
            + (f" by '{artist}'" if artist else "")
            + " is not in your catalog. Upload it on the Analyze page first — "
            "recommendations use our Demucs/librosa fingerprints, not Spotify."
        )

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]
