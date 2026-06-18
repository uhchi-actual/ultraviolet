"""Tests for in-house similarity recommender."""

from __future__ import annotations

import random

import numpy as np

from src.models.identifiers import IdentifierVector, LoudnessProfile, StemPresence
from src.recommendation.similarity_engine import recommend_branches, score_catalog

_EMB = (np.ones(512, dtype=np.float32) / np.sqrt(512)).tolist()


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


def _track(tid: str, title: str, artist: str, **vec_kwargs) -> dict:
    return {
        "track_id": tid,
        "title": title,
        "artist": artist,
        "popularity_score": 100,
        "clap_embedding": _EMB,
        "genres": [10],
        "identifiers": _vector(**vec_kwargs).model_dump(),
    }


def test_recommend_branches_returns_matches():
    seed = _track("seed", "Seed", "Artist", tempo=72, harmonic_darkness=0.8)
    catalog = [
        seed,
        _track("close", "Close", "A", tempo=74, harmonic_darkness=0.78),
        _track("far", "Far", "B", tempo=180, energy=0.95, harmonic_darkness=0.1),
    ]
    picks = recommend_branches(
        seed,
        catalog,
        count=2,
        exclude_ids={"seed"},
        exclude_keys=set(),
        obscurity_dial=0.5,
        depth=1,
        rng=random.Random(42),
    )
    assert len(picks) >= 1
    assert picks[0]["track"]["track_id"] == "close"


def test_score_catalog_excludes_seed():
    seed = _track("seed", "Seed", "Artist")
    catalog = [seed, _track("other", "Other", "O")]
    scored = score_catalog(
        seed,
        catalog,
        exclude_ids={"seed"},
        exclude_keys=set(),
        obscurity_dial=0.5,
        depth=1,
    )
    assert all(s["track"]["track_id"] != "seed" for s in scored)
