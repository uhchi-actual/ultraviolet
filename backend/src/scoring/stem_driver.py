"""Stem-separated CLAP similarity — on-demand Demucs + per-stem embedding."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

from src.scoring.clap_driver import clap_similarity, embed_audio

logger = logging.getLogger("ultraviolet.stem_driver")

DEFAULT_STEM_WEIGHTS = {
    "drums": 0.25,
    "bass": 0.25,
    "other": 0.25,
    "vocals": 0.25,
}


def _stem_arrays_from_separated(stems) -> dict[str, np.ndarray]:
    return {
        "drums": stems.drums,
        "bass": stems.bass,
        "other": stems.other,
        "vocals": stems.vocals,
    }


def stem_similarity_from_audio_paths(
    path_a: str,
    path_b: str,
    *,
    track_id_a: str | None = None,
    track_id_b: str | None = None,
    user_weights: dict[str, float] | None = None,
) -> float:
    """Run Demucs on both files and compare stem CLAP embeddings."""
    from src.analysis.demucs_separator import separate_track
    from src.utils.ollama_vram import unload_ollama_models

    unload_ollama_models()
    weights = {**DEFAULT_STEM_WEIGHTS, **(user_weights or {})}
    tid_a = track_id_a or "stem_a"
    tid_b = track_id_b or "stem_b"
    stems_a = separate_track(path_a, tid_a)
    stems_b = separate_track(path_b, tid_b)
    return stem_similarity_from_stems(
        _stem_arrays_from_separated(stems_a),
        _stem_arrays_from_separated(stems_b),
        stems_a.sr,
        user_weights=weights,
    )


def stem_similarity_from_stems(
    stems_a: dict[str, np.ndarray],
    stems_b: dict[str, np.ndarray],
    sr: int,
    *,
    user_weights: dict[str, float] | None = None,
) -> float:
    """Linear combination of per-stem CLAP similarities (Vohra et al. 2026)."""
    weights = {**DEFAULT_STEM_WEIGHTS, **(user_weights or {})}
    total_w = 0.0
    total_sim = 0.0
    for stem_name in ("drums", "bass", "other", "vocals"):
        w = float(weights.get(stem_name, 0.25))
        if w <= 0:
            continue
        audio_a = stems_a.get(stem_name)
        audio_b = stems_b.get(stem_name)
        if audio_a is None or audio_b is None or len(audio_a) < sr // 8 or len(audio_b) < sr // 8:
            continue
        emb_a = embed_audio(audio_a, sr)
        emb_b = embed_audio(audio_b, sr)
        total_sim += w * clap_similarity(emb_a, emb_b)
        total_w += w
    if total_w <= 0:
        return 0.0
    return total_sim / total_w


def stem_similarity_from_tracks(
    track_a: dict[str, Any],
    track_b: dict[str, Any],
    *,
    user_weights: dict[str, float] | None = None,
) -> float | None:
    """On-demand stem score when audio paths are available; None if skipped."""
    path_a = track_a.get("audio_path")
    path_b = track_b.get("audio_path")
    if not path_a or not path_b:
        return None
    from pathlib import Path

    if not Path(path_a).exists() or not Path(path_b).exists():
        return None
    return stem_similarity_from_audio_paths(
        path_a,
        path_b,
        track_id_a=str(track_a.get("track_id", "a")),
        track_id_b=str(track_b.get("track_id", "b")),
        user_weights=user_weights,
    )
