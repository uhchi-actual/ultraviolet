"""Tests for perceptual music similarity."""

from src.models.identifiers import IdentifierVector, LoudnessProfile, StemPresence
from src.recommendation.perceptual_distance import (
    circle_of_fifths_distance,
    key_similarity,
    perceptual_similarity,
    tempo_similarity,
)
from src.recommendation.scoring import weighted_cosine_similarity


def _ids(**kwargs) -> IdentifierVector:
    base = dict(
        tempo=120.0,
        key=0,
        mode=1,
        energy=0.5,
        danceability=0.5,
        instrumentalness=0.3,
        valence=0.5,
        acousticness=0.4,
        loudness_profile=LoudnessProfile(),
        texture_density=0.5,
        rhythmic_complexity=0.4,
        harmonic_darkness=0.5,
        stem_presence=StemPresence(),
    )
    base.update(kwargs)
    return IdentifierVector(**base)


def test_same_track_high_similarity():
    a = _ids()
    assert perceptual_similarity(a, a) > 0.95


def test_circle_of_fifths_same_key():
    assert circle_of_fifths_distance(0, 1, 0, 1) == 0.0


def test_tempo_octave_invariant():
    assert tempo_similarity(120, 60) > tempo_similarity(120, 90)


def test_tempo_ratio_identical():
    assert tempo_similarity(120, 120) > 0.99


def test_weighted_cosine_identical():
    vec = [0.5, 0.6, 0.7]
    assert weighted_cosine_similarity(vec, vec, [1.0, 1.0, 1.0]) > 0.99


def test_key_similarity_same_key():
    assert key_similarity(0, 1, 0, 1) > 0.99


def test_distant_tracks_lower():
    close = _ids(tempo=120, key=5, energy=0.6)
    far = _ids(tempo=180, key=0, energy=0.95, harmonic_darkness=0.1)
    assert perceptual_similarity(close, far) < perceptual_similarity(
        close, _ids(tempo=122, key=5, energy=0.58)
    )
