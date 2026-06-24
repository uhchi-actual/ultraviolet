"""SOUL agent tests (Phase 3) — history parsing, stats, RAG docs, taste coercion."""

import asyncio
import json

from src.agents.soul import Soul
from src.models.identifiers import UserTasteVector
from src.models.user import TASTE_KEYS, coerce_taste, neutral_taste
from src.utils.listening import build_documents, chunk_text, compute_stats, parse_history


def _extended(ts: str, artist: str, track: str, ms: int) -> dict:
    return {
        "ts": ts,
        "ms_played": ms,
        "master_metadata_track_name": track,
        "master_metadata_album_artist_name": artist,
    }


def test_parse_extended_and_basic_formats() -> None:
    extended = json.dumps(
        [
            _extended("2024-01-01T22:00:00Z", "The Cure", "Plainsong", 300000),
            _extended("2024-01-01T23:00:00Z", "The Cure", "Plainsong", 5000),  # skip
            {"episode_name": "podcast", "ts": "2024-01-02T10:00:00Z", "ms_played": 60000},
        ]
    ).encode()
    basic = json.dumps(
        [
            {
                "endTime": "2024-01-01 22:00",
                "artistName": "Aphex Twin",
                "trackName": "Avril 14th",
                "msPlayed": 120000,
            }
        ]
    ).encode()

    ext_events = parse_history(extended)
    assert len(ext_events) == 2  # podcast (no track) dropped
    assert ext_events[0].artist == "The Cure"
    assert ext_events[1].skipped is True

    basic_events = parse_history(basic)
    assert len(basic_events) == 1
    assert basic_events[0].track == "Avril 14th"


def test_compute_stats_heatmap_and_totals() -> None:
    events = parse_history(
        json.dumps(
            [
                _extended("2024-01-01T22:00:00Z", "The Cure", "Plainsong", 300000),
                _extended("2024-01-01T22:30:00Z", "The Cure", "Lullaby", 240000),
                _extended("2024-01-02T09:00:00Z", "Boards of Canada", "Roygbiv", 180000),
            ]
        ).encode()
    )
    stats = compute_stats(events)

    assert len(stats.heatmap) == 7
    assert all(len(row) == 24 for row in stats.heatmap)
    assert stats.total_tracks == 3  # 3 unique (artist, track) pairs
    assert stats.total_hours > 0
    assert stats.top_artists[0]["artist"] == "The Cure"  # most hours
    assert stats.peak_slot is not None


def test_build_documents_and_chunker() -> None:
    events = parse_history(
        json.dumps([_extended("2024-01-01T22:00:00Z", "Slowdive", "Alison", 250000)]).encode()
    )
    docs = build_documents(compute_stats(events))
    assert docs and any("Slowdive" in d for d in docs)

    chunks = chunk_text(" ".join(str(i) for i in range(1200)), size=512, overlap=64)
    assert len(chunks) >= 2  # 1200 words spills past one 512-word chunk


def test_coerce_taste_clamps_and_fills() -> None:
    coerced = coerce_taste({"valence_weight": 2.5, "energy_weight": -1, "bogus": 1})
    assert set(coerced) == set(TASTE_KEYS)
    assert coerced["valence_weight"] == 1.0  # clamped high
    assert coerced["energy_weight"] == 0.0  # clamped low
    assert coerced["danceability_weight"] == 0.5  # default fill
    assert neutral_taste()["valence_weight"] == 0.5


def test_default_weights_are_neutral_without_db() -> None:
    weights = asyncio.run(Soul().get_user_weights())
    assert isinstance(weights, UserTasteVector)
    assert all(v == 1.0 for v in weights.model_dump().values())
