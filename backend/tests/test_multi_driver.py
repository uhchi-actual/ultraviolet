"""Tests for multi-driver scoring and graph driver."""

import numpy as np

from src.scoring.graph_driver import genre_graph_score
from src.scoring.ultraviolet_score import UserProfile, ultraviolet_score


def test_genre_graph_same_genre():
    a = {"genres": [21]}
    b = {"genres": [21]}
    assert genre_graph_score(a, b) == 1.0


def test_ultraviolet_score_high_clap_agreement():
    emb = np.random.randn(512).astype(np.float32)
    emb = emb / np.linalg.norm(emb)
    vec = emb.tolist()
    features = {
        "tempo": 120.0,
        "key": 5,
        "mode": 1,
        "energy": 0.6,
        "danceability": 0.5,
        "instrumentalness": 0.3,
        "valence": 0.5,
        "acousticness": 0.4,
        "loudness_profile": {"peak_db": -3, "rms_db": -12, "dynamic_range": 6, "crest_factor": 2},
        "texture_density": 0.5,
        "rhythmic_complexity": 0.4,
        "harmonic_darkness": 0.5,
        "stem_presence": {"drums_pct": 25, "bass_pct": 25, "other_pct": 25, "vocals_pct": 25},
        "emotional_arc": {"values": [], "label": ""},
        "spectral_embedding": [0.1] * 25,
    }
    a = {"track_id": "a", "clap_embedding": vec, "identifiers": features, "genres": [10]}
    b = {"track_id": "b", "clap_embedding": vec, "identifiers": features, "genres": [10]}
    grade = ultraviolet_score(a, b, UserProfile())
    assert grade["score"] > 0.85
    assert grade["drivers"]["clap"] > 0.99


def test_clap_similarity_identical():
    from src.scoring.clap_driver import clap_similarity

    v = [1.0, 0.0, 0.0]
    assert clap_similarity(v, v) > 0.99
