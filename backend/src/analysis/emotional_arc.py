"""Identifier 10 — Emotional Arc (PRD §4).

Divides the track into 4 equal segments and computes an absolute intensity per
segment (RMS energy + spectral brightness) so the shape captures the emotional
trajectory: flat ≈ [0.5, 0.5, 0.5, 0.5], slow build ≈ [0.2, 0.4, 0.7, 0.9].
"""

from __future__ import annotations

import librosa
import numpy as np

_EPS = 1e-9


def _norm(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.0
    return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))


def extract_emotional_arc(y: np.ndarray, sr: int) -> list[float]:
    if len(y) == 0:
        return [0.0, 0.0, 0.0, 0.0]

    segments = np.array_split(y, 4)
    scores: list[float] = []
    for seg in segments:
        if len(seg) == 0:
            scores.append(0.0)
            continue
        rms = float(np.sqrt(np.mean(seg**2)))
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=seg, sr=sr)))
        intensity = 0.6 * _norm(rms, 0.0, 0.2) + 0.4 * _norm(centroid, 500.0, 4000.0)
        scores.append(round(intensity, 3))
    return scores
