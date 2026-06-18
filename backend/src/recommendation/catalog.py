"""JSON track catalog on D: — recommendation pool without PostgreSQL."""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path
from typing import Any

from src.config import settings
from src.models.identifiers import IdentifierVector

logger = logging.getLogger("ultraviolet.catalog")

_DEMO_SOURCE = Path(__file__).resolve().parents[2] / "data" / "demo_catalog.json"


def _catalog_path() -> Path:
    return Path(settings.catalog_dir) / "tracks.json"


def _ensure_catalog() -> Path:
    path = _catalog_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("[]", encoding="utf-8")
    return path


def list_tracks() -> list[dict[str, Any]]:
    path = _ensure_catalog()
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []


def get_track(track_id: str) -> dict[str, Any] | None:
    for track in list_tracks():
        if track.get("track_id") == track_id:
            return track
    return None


def upsert_track(
    track_id: str,
    title: str,
    artist: str,
    identifiers: IdentifierVector | dict[str, Any],
    *,
    popularity_score: int = 0,
    play_count: int = 0,
    source: str = "user_upload",
    spotify_id: str | None = None,
    clap_embedding: list[float] | None = None,
    audio_path: str | None = None,
) -> dict[str, Any]:
    path = _ensure_catalog()
    tracks = list_tracks()
    payload = identifiers.model_dump() if isinstance(identifiers, IdentifierVector) else identifiers
    record = {
        "track_id": track_id,
        "title": title,
        "artist": artist,
        "identifiers": payload,
        "popularity_score": popularity_score,
        "play_count": play_count,
        "source": source,
    }
    if spotify_id:
        record["spotify_id"] = spotify_id
    if clap_embedding:
        record["clap_embedding"] = clap_embedding
    if audio_path:
        record["audio_path"] = audio_path
    replaced = False
    for i, track in enumerate(tracks):
        if track.get("track_id") == track_id:
            tracks[i] = {**track, **record}
            replaced = True
            break
    if not replaced:
        tracks.append(record)
    path.write_text(json.dumps(tracks, indent=2), encoding="utf-8")
    return record


def library_tracks(min_plays: int = 1) -> list[dict[str, Any]]:
    """Tracks from real user listening history — not the demo catalog."""
    return [
        t
        for t in list_tracks()
        if t.get("source") in ("spotify_history", "playlist_export")
        and int(t.get("play_count", 0)) >= min_plays
    ]


def purge_junk_tracks() -> int:
    """Remove unnamed listen captures from the catalog."""
    from src.recommendation.catalog_filters import is_named_track

    tracks = list_tracks()
    kept = [t for t in tracks if is_named_track(t)]
    removed = len(tracks) - len(kept)
    if removed:
        _catalog_path().write_text(json.dumps(kept, indent=2), encoding="utf-8")
        logger.info("Purged %d junk catalog entries", removed)
    return removed


# Fake demo artists invented for the seed catalog — not real musicians.
_FAKE_DEMO_ARTISTS = frozenset(
    {
        "vera bloom",
        "hollow frequency",
        "pale architecture",
        "terminal youth",
        "soft collapse",
        "salt collapse",
        "minor transit",
    }
)

_FAKE_DEMO_TRACK_IDS = frozenset(
    {
        "demo_night_shift",
        "demo_static_veil",
        "demo_glass_cathedral",
        "demo_oxide_pulse",
        "demo_mercury_lines",
        "demo_rust_garden",
    }
)


def _norm_artist(artist: str) -> str:
    return (artist or "").strip().lower()


def is_fake_demo_track(track: dict[str, Any]) -> bool:
    tid = track.get("track_id", "")
    if tid in _FAKE_DEMO_TRACK_IDS:
        return True
    return _norm_artist(track.get("artist", "")) in _FAKE_DEMO_ARTISTS


def purge_demo_tracks() -> int:
    """Remove invented demo-catalog tracks (fake artists)."""
    tracks = list_tracks()
    kept = [t for t in tracks if not is_fake_demo_track(t)]
    removed = len(tracks) - len(kept)
    if removed:
        _catalog_path().write_text(json.dumps(kept, indent=2), encoding="utf-8")
        logger.info("Purged %d fake demo catalog entries", removed)
    return removed


def catalog_size() -> int:
    return len(list_tracks())


def save_catalog(tracks: list[dict[str, Any]]) -> None:
    _ensure_catalog()
    _catalog_path().write_text(json.dumps(tracks, indent=2), encoding="utf-8")


def update_track_metadata(track_id: str, *, title: str | None = None, artist: str | None = None) -> dict[str, Any] | None:
    """Rename an analyzed track after NicheSearch identifies it."""
    tracks = list_tracks()
    for i, track in enumerate(tracks):
        if track.get("track_id") != track_id:
            continue
        if title:
            track["title"] = title
        if artist:
            track["artist"] = artist
        tracks[i] = track
        _catalog_path().write_text(json.dumps(tracks, indent=2), encoding="utf-8")
        return track
    return None
