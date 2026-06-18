"""Verify tree scales beyond the old 15-track catalog ceiling."""

from __future__ import annotations

import numpy as np

from src.models.identifiers import IdentifierVector, LoudnessProfile, StemPresence
from src.recommendation.manual_tree import build_manual_tree


_BASE_EMB = np.random.default_rng(42).standard_normal(512).astype(np.float32)
_BASE_EMB = _BASE_EMB / np.linalg.norm(_BASE_EMB)


def _track(i: int, *, tempo: float, key: int, energy: float) -> dict:
    noise = np.random.default_rng(i).standard_normal(512).astype(np.float32) * 0.04
    emb = _BASE_EMB + noise
    emb = emb / np.linalg.norm(emb)
    return {
        "track_id": f"synth_{i:03d}",
        "title": f"Track {i}",
        "artist": f"Artist {i % 12}",
        "source": "fma",
        "genres": [10 + (i % 20)],
        "clap_embedding": emb.tolist(),
        "identifiers": IdentifierVector(
            tempo=tempo,
            key=key % 12,
            mode=i % 2,
            energy=energy,
            danceability=0.3 + (i % 7) * 0.08,
            instrumentalness=0.2 + (i % 5) * 0.1,
            valence=0.4 + (i % 6) * 0.08,
            acousticness=0.3 + (i % 4) * 0.1,
            loudness_profile=LoudnessProfile(),
            texture_density=0.4 + (i % 8) * 0.06,
            rhythmic_complexity=0.3 + (i % 9) * 0.05,
            harmonic_darkness=0.5 + (i % 10) * 0.04,
            stem_presence=StemPresence(
                drums_pct=20 + i % 15,
                bass_pct=20 + i % 12,
                other_pct=30 + i % 20,
                vocals_pct=10 + i % 8,
            ),
        ).model_dump(),
    }


def test_tree_reaches_40_plus_nodes_with_large_catalog(monkeypatch):
    tracks = [_track(i, tempo=80 + (i % 40), key=i % 12, energy=0.3 + (i % 10) * 0.06) for i in range(60)]
    seed = tracks[0]
    seed["title"] = "Ceremony"
    seed["artist"] = "New Order"
    seed["track_id"] = "seed_ceremony"
    tracks[0] = seed

    monkeypatch.setattr("src.recommendation.manual_tree.recommendation_pool", lambda: tracks)
    monkeypatch.setattr("src.recommendation.catalog_lookup.list_tracks", lambda: [seed])

    result = build_manual_tree([{"title": "Ceremony", "artist": "New Order"}], recs_per_seed=8)
    node_count = len(result["tree"]["nodes"])
    assert node_count >= 40, f"Expected 40+ nodes, got {node_count}"
