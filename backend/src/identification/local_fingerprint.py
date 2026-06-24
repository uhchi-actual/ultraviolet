"""Local sonic fingerprint — match analyzed audio against the catalog without external APIs."""

from __future__ import annotations

from typing import Any

from src.models.identifiers import IdentifierVector
from src.recommendation.catalog_filters import recommendable_tracks, track_dedupe_key
from src.recommendation.catalog_lookup import resolve_seed_from_catalog
from src.recommendation.perceptual_distance import perceptual_similarity


def _hit_from_track(track: dict[str, Any], *, confidence: float, reason: str) -> dict[str, Any]:
    return {
        "title": track.get("title", ""),
        "artist": track.get("artist", ""),
        "url": f"catalog://{track.get('track_id', '')}",
        "source": "ultraviolet",
        "query": reason,
        "match_reason": reason,
        "confidence": round(confidence, 3),
        "kind": "identity",
        "track_id": track.get("track_id"),
    }


def identify_in_catalog(
    identifiers: IdentifierVector,
    *,
    title: str | None = None,
    artist: str | None = None,
    exclude_track_id: str | None = None,
    limit: int = 8,
) -> list[dict[str, Any]]:
    """Nearest-neighbor retrieval over catalog fingerprints (chroma+MFCC + scalars)."""
    hits: list[dict[str, Any]] = []
    catalog = recommendable_tracks()

    if title and title.strip():
        title_key = track_dedupe_key({"title": title, "artist": artist or ""})
        direct = next((track for track in catalog if track_dedupe_key(track) == title_key), None)
        if direct and not (exclude_track_id and direct.get("track_id") == exclude_track_id):
            hits.append(_hit_from_track(direct, confidence=0.95, reason="Catalog title match"))

        try:
            if not hits:
                match = resolve_seed_from_catalog(title.strip(), (artist or "").strip())
                if exclude_track_id and match.get("track_id") == exclude_track_id:
                    match = None
                if match:
                    hits.append(
                        _hit_from_track(match, confidence=0.95, reason="Catalog title match")
                    )
        except (ImportError, ValueError):
            pass

    scored: list[tuple[float, dict[str, Any]]] = []
    seen_keys = {
        track_dedupe_key({"title": h.get("title", ""), "artist": h.get("artist", "")}) for h in hits
    }

    for track in catalog:
        if exclude_track_id and track.get("track_id") == exclude_track_id:
            continue
        key = track_dedupe_key(track)
        if key in seen_keys:
            continue
        sim = perceptual_similarity(identifiers, track.get("identifiers", {}))
        if sim < 0.42:
            continue
        scored.append((sim, track))

    scored.sort(key=lambda x: x[0], reverse=True)
    for sim, track in scored:
        if len(hits) >= limit:
            break
        key = track_dedupe_key(track)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        hits.append(
            _hit_from_track(
                track,
                confidence=sim,
                reason=f"Sonic fingerprint · {sim:.0%} perceptual match",
            )
        )

    return hits[:limit]
