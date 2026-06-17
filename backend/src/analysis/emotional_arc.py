"""Emotional arc — quarter-by-quarter intensity on the full mix.

Only surfaced when variation exceeds 15% (max − min > 0.15); otherwise labeled
"Consistent throughout" with no chart data.
"""

from __future__ import annotations

import librosa
import numpy as np

from src.models.identifiers import EmotionalArc

_EPS = 1e-9
_VARIATION_THRESHOLD = 0.15


def _norm(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.0
    return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))


def extract_emotional_arc(y: np.ndarray, sr: int) -> EmotionalArc:
    if len(y) == 0:
        return EmotionalArc()

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

    if max(scores) - min(scores) <= _VARIATION_THRESHOLD:
        return EmotionalArc(values=[], label="Consistent intensity throughout")

    return EmotionalArc(values=scores, label="")
