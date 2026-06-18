"""Tests for NicheSearch query building."""

from src.identification.niche_search import build_identity_queries, build_niche_queries, stem_section_hints
from src.models.identifiers import EmotionalArc, IdentifierVector, LoudnessProfile, StemPresence


def _vector(**kwargs) -> IdentifierVector:
    base = dict(
        tempo=128.0,
        key=9,
        mode=0,
        energy=0.7,
        danceability=0.6,
        instrumentalness=0.2,
        loudness_profile=LoudnessProfile(),
        texture_density=0.5,
        rhythmic_complexity=0.4,
        harmonic_darkness=0.5,
        stem_presence=StemPresence(drums_pct=30, bass_pct=25, other_pct=35, vocals_pct=10),
        emotional_arc=EmotionalArc(),
    )
    base.update(kwargs)
    return IdentifierVector(**base)


def test_identity_queries_artist_title():
    q = build_identity_queries("Darkness", "Chris Stussy")
    assert q[0] == "Chris Stussy Darkness"


def test_identity_queries_skip_generic():
    assert build_identity_queries("Identified track", "Unknown Artist") == []


def test_identity_queries_skip_listen_capture():
    assert build_identity_queries("listen-1739123456", None) == []


def test_identity_queries_spotify_fielded():
    q = build_identity_queries("End of the Line", "Daft Punk")
    assert "Daft Punk End of the Line" in q
    assert '"End of the Line" Daft Punk' in q


def test_niche_queries_separate():
    q = build_niche_queries(_vector(), title="Darkness", artist="Chris Stussy")
    assert "remix" in q[0].lower()
