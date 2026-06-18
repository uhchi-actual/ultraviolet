"""Recommendation engine tests."""

from __future__ import annotations

import json

from src.models.identifiers import IdentifierVector, LoudnessProfile, StemPresence
from src.recommendation.engine import generate_radio
from src.recommendation.vectorize import to_feature_vector, user_weights_from_taste


def _vector(**kwargs) -> IdentifierVector:
    defaults = dict(
        tempo=120.0,
        key=0,
        mode=0,
        energy=0.5,
        danceability=0.5,
        instrumentalness=0.5,
        loudness_profile=LoudnessProfile(rms_db=-12.0),
        texture_density=0.5,
        rhythmic_complexity=0.5,
        harmonic_darkness=0.5,
        stem_presence=StemPresence(drums_pct=25, bass_pct=25, other_pct=25, vocals_pct=25),
    )
    defaults.update(kwargs)
    return IdentifierVector(**defaults)


def test_to_feature_vector_length():
    vec = to_feature_vector(_vector())
    assert len(vec) == 13


def test_generate_radio_from_catalog(tmp_path, monkeypatch):
    catalog_file = tmp_path / "tracks.json"
    session_file = tmp_path / "last_radio.json"
    tracks = [
        {
            "track_id": "seed_1",
            "title": "Seed",
            "artist": "Artist",
            "popularity_score": 100,
            "play_count": 10,
            "identifiers": _vector(tempo=72, harmonic_darkness=0.8).model_dump(),
        },
        {
            "track_id": "match_1",
            "title": "Match",
            "artist": "Match Artist",
            "popularity_score": 50,
            "play_count": 5,
            "identifiers": _vector(tempo=74, harmonic_darkness=0.78).model_dump(),
        },
        {
            "track_id": "far_1",
            "title": "Far",
            "artist": "Far Artist",
            "popularity_score": 5000,
            "play_count": 0,
            "identifiers": _vector(tempo=180, energy=0.95, harmonic_darkness=0.1).model_dump(),
        },
    ]
    catalog_file.write_text(json.dumps(tracks), encoding="utf-8")

    monkeypatch.setattr("src.recommendation.catalog._catalog_path", lambda: catalog_file)
    monkeypatch.setattr("src.recommendation.session._session_path", lambda: session_file)

    result = generate_radio("seed_1", count=5, obscurity_dial=0.7)
    assert result["seed"]["track_id"] == "seed_1"
    assert len(result["recommendations"]) >= 1
    assert all(r["confidence"] >= 0.6 for r in result["recommendations"])
    assert result["recommendations"][0]["tree_chain"]


def test_user_weights_defaults():
    weights = user_weights_from_taste(None)
    assert weights == [1.0] * 13
