"""Tests for catalog seed lookup."""

import pytest

from src.recommendation.catalog_lookup import resolve_seed_from_catalog


def test_resolve_fuzzy_title_local(monkeypatch):
    catalog_track = {
        "track_id": "local_ceremony",
        "title": "Ceremony",
        "artist": "New Order",
        "clap_embedding": [0.1] * 512,
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
    monkeypatch.setattr("src.recommendation.catalog_lookup._resolve_fma_seed", lambda t, a: None)
    monkeypatch.setattr(
        "src.recommendation.catalog_lookup.list_tracks",
        lambda: [catalog_track],
    )
    hit = resolve_seed_from_catalog("Ceremony", "New Order")
    assert hit["track_id"] == "local_ceremony"


def test_resolve_text_fallback_when_not_in_fma(monkeypatch):
    monkeypatch.setattr("src.recommendation.catalog_lookup._resolve_fma_seed", lambda t, a: None)
    monkeypatch.setattr("src.recommendation.catalog_lookup.list_tracks", lambda: [])
    monkeypatch.setattr(
        "src.recommendation.catalog_lookup.embed_text",
        lambda desc: [0.1] * 512,
        raising=False,
    )
    from src.scoring import clap_driver

    monkeypatch.setattr(clap_driver, "embed_text", lambda desc: [0.1] * 512)

    hit = resolve_seed_from_catalog("Ceremony", "New Order")
    assert hit["source"] == "clap_text"
    assert hit["title"] == "Ceremony"
    assert len(hit["clap_embedding"]) == 512


def test_resolve_fma_preferred(monkeypatch):
    fma_track = {
        "track_id": "fma_123",
        "title": "Freeway",
        "artist": "Kurt Vile",
        "clap_embedding": [0.2] * 512,
        "identifiers": {},
    }
    monkeypatch.setattr(
        "src.recommendation.catalog_lookup._resolve_fma_seed",
        lambda t, a: fma_track,
    )
    hit = resolve_seed_from_catalog("Freeway", "Kurt Vile")
    assert hit["track_id"] == "fma_123"
