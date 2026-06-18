"""Composite Ultraviolet Grade — 4-driver ensemble with cross-validation confidence."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from src.scoring.clap_driver import clap_similarity
from src.scoring.graph_driver import genre_graph_score
from src.scoring.spectral_driver import spectral_similarity
from src.scoring.stem_driver import stem_similarity_from_tracks

DEFAULT_DRIVER_WEIGHTS = {
    "clap": 0.40,
    "stem": 0.25,
    "spectral": 0.20,
    "graph": 0.15,
}


@dataclass
class UserProfile:
    driver_weights: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_DRIVER_WEIGHTS))
    stem_weights: dict[str, float] | None = None
    feature_weights: dict[str, float] | None = None
    run_stem: bool = False


def _clap_score(track_a: dict[str, Any], track_b: dict[str, Any]) -> float:
    emb_a = track_a.get("clap_embedding") or []
    emb_b = track_b.get("clap_embedding") or []
    if len(emb_a) < 8 or len(emb_b) < 8:
        return 0.0
    return clap_similarity(emb_a, emb_b)


def ultraviolet_score(
    track_a: dict[str, Any],
    track_b: dict[str, Any],
    user_profile: UserProfile | None = None,
) -> dict[str, Any]:
    """Multi-driver ensemble score with per-driver breakdown and confidence."""
    profile = user_profile or UserProfile()
    weights = {**DEFAULT_DRIVER_WEIGHTS, **profile.driver_weights}

    s_clap = _clap_score(track_a, track_b)
    s_spectral = spectral_similarity(
        track_a.get("identifiers") or track_a.get("features") or {},
        track_b.get("identifiers") or track_b.get("features") or {},
        profile.feature_weights,
    )
    s_graph = genre_graph_score(track_a, track_b)

    s_stem: float | None = None
    if profile.run_stem:
        s_stem = stem_similarity_from_tracks(track_a, track_b, user_weights=profile.stem_weights)

    # When stem is skipped, redistribute its weight to CLAP + spectral
    if s_stem is None:
        stem_w = weights["stem"]
        weights = dict(weights)
        weights["clap"] += stem_w * 0.6
        weights["spectral"] += stem_w * 0.4
        weights["stem"] = 0.0
        s_stem = s_spectral * 0.85  # neutral stem prior from spectral
    else:
        s_stem = float(s_stem)

    w_sum = weights["clap"] + weights["stem"] + weights["spectral"] + weights["graph"]
    raw = (
        weights["clap"] * s_clap
        + weights["stem"] * s_stem
        + weights["spectral"] * s_spectral
        + weights["graph"] * s_graph
    ) / max(w_sum, 1e-9)

    scores = np.array([s_clap, s_stem, s_spectral, s_graph], dtype=np.float64)
    variance = float(np.var(scores))
    confidence = 1.0 - min(variance * 4.0, 0.5)

    if variance < 0.05:
        agreement = "high"
    elif variance < 0.15:
        agreement = "moderate"
    else:
        agreement = "divergent"

    return {
        "score": float(raw),
        "confidence": round(confidence, 3),
        "drivers": {
            "clap": round(s_clap, 3),
            "stem": round(s_stem, 3),
            "spectral": round(s_spectral, 3),
            "graph": round(s_graph, 3),
        },
        "agreement": agreement,
        "variance": round(variance, 4),
    }
