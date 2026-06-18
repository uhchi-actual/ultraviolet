"""Tests for local catalog fingerprint identification."""

from src.identification.local_fingerprint import identify_in_catalog
from src.models.identifiers import IdentifierVector, LoudnessProfile, StemPresence


def _vector(**kwargs) -> IdentifierVector:
    base = dict(
        tempo=72.0,
        key=9,
        mode=0,
        energy=0.42,
        danceability=0.38,
        instrumentalness=0.12,
        valence=0.4,
        acousticness=0.3,
        loudness_profile=LoudnessProfile(),
        texture_density=0.68,
        rhythmic_complexity=0.31,
        harmonic_darkness=0.79,
        stem_presence=StemPresence(drums_pct=18, bass_pct=22, other_pct=48, vocals_pct=12),
    )
    base.update(kwargs)
    return IdentifierVector(**base)


def test_identify_title_match(monkeypatch):
    track = {
        "track_id": "demo_plainsong",
        "title": "Plainsong",
        "artist": "The Cure",
        "identifiers": _vector().model_dump(),
    }
    monkeypatch.setattr(
        "src.identification.local_fingerprint.recommendable_tracks",
        lambda: [track],
    )
    monkeypatch.setattr(
        "src.recommendation.catalog_lookup.list_tracks",
        lambda: [track],
    )
    hits = identify_in_catalog(_vector(), title="Plainsong", artist="The Cure")
    assert hits
    assert hits[0]["title"] == "Plainsong"
