"""Resolve tree/search seeds — FMA catalog, optional local uploads, or CLAP text."""

from __future__ import annotations

import hashlib
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


def _default_identifiers() -> dict[str, Any]:
    return {
        "tempo": 120.0,
        "key": 0,
        "mode": 1,
        "energy": 0.5,
        "danceability": 0.5,
        "instrumentalness": 0.5,
        "valence": 0.5,
        "acousticness": 0.5,
        "loudness_profile": {
            "peak_db": -3.0,
            "rms_db": -12.0,
            "dynamic_range": 6.0,
            "crest_factor": 2.0,
        },
        "texture_density": 0.5,
        "rhythmic_complexity": 0.5,
        "harmonic_darkness": 0.5,
        "stem_presence": {"drums_pct": 25, "bass_pct": 25, "other_pct": 25, "vocals_pct": 25},
        "emotional_arc": {"values": [], "label": ""},
        "spectral_embedding": [0.0] * 25,
    }


def _resolve_fma_seed(title: str, artist: str) -> dict[str, Any] | None:
    from src.catalog.fma import get_fma_track, search_fma

    query = f"{artist} - {title}" if artist else title
    hits = search_fma(query, limit=12)
    best: tuple[float, dict[str, Any]] | None = None
    for hit in hits:
        score = _match_score(title, artist, hit)
        if score < 4.0:
            continue
        full = get_fma_track(hit["track_id"]) or hit
        if not full.get("clap_embedding"):
            continue
        if best is None or score > best[0]:
            best = (score, full)
    return best[1] if best else None


def _resolve_local_seed(title: str, artist: str) -> dict[str, Any] | None:
    candidates: list[tuple[float, dict[str, Any]]] = []
    for track in list_tracks():
        if not is_named_track(track):
            continue
        if len(track.get("clap_embedding") or []) < 8:
            continue
        score = _match_score(title, artist, track)
        if score >= 2.5:
            candidates.append((score, track))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def _resolve_text_seed(title: str, artist: str) -> dict[str, Any]:
    """CLAP text embedding — any artist/title works without upload or FMA match."""
    from src.scoring.clap_driver import embed_text

    label = f"{artist} — {title}" if artist else title
    slug = hashlib.sha1(f"{_norm(artist)}|{_norm(title)}".encode()).hexdigest()[:12]
    description = f"{label}, song, music"
    return {
        "track_id": f"text_{slug}",
        "title": title,
        "artist": artist or "Unknown",
        "source": "clap_text",
        "genre_bucket": "unknown",
        "clap_embedding": embed_text(description),
        "identifiers": _default_identifiers(),
    }


def resolve_seed_from_catalog(title: str, artist: str = "") -> dict[str, Any]:
    """Resolve a seed: FMA (8k tracks) → local upload → CLAP text for anything else."""
    title = title.strip()
    artist = artist.strip()
    if not title:
        raise ValueError("Song title is required")

    fma = _resolve_fma_seed(title, artist)
    if fma is not None:
        return fma

    local = _resolve_local_seed(title, artist)
    if local is not None:
        return local

    return _resolve_text_seed(title, artist)
