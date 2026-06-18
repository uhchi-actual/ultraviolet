"""Tests for catalog seed lookup."""

from src.recommendation.catalog_lookup import resolve_seed_from_catalog


def test_resolve_fuzzy_title(monkeypatch):
    catalog_track = {
        "track_id": "demo_ceremony",
        "title": "Ceremony",
        "artist": "New Order",
        "identifiers": {
            "tempo": 120.0,
            "key": 0,
            "mode": 0,
            "energy": 0.5,
            "danceability": 0.5,
            "instrumentalness": 0.5,
            "loudness_profile": {"peak_db": -4, "rms_db": -12, "dynamic_range": 6, "crest_factor": 2},
            "texture_density": 0.5,
            "rhythmic_complexity": 0.5,
            "harmonic_darkness": 0.5,
            "stem_presence": {"drums_pct": 25, "bass_pct": 25, "other_pct": 25, "vocals_pct": 25},
            "emotional_arc": {"values": [], "label": ""},
        },
    }
    monkeypatch.setattr(
        "src.recommendation.catalog_lookup.list_tracks",
        lambda: [catalog_track],
    )
    hit = resolve_seed_from_catalog("Ceremony", "New Order")
    assert hit["track_id"] == "demo_ceremony"


def test_resolve_missing_raises(monkeypatch):
    monkeypatch.setattr("src.recommendation.catalog_lookup.list_tracks", lambda: [])
    try:
        resolve_seed_from_catalog("Not A Real Song", "Nobody")
        raised = False
    except ValueError as exc:
        raised = True
        assert "Analyze page" in str(exc)
    assert raised
