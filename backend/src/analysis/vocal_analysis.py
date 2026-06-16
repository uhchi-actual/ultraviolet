"""Identifier 11 — Vocal Character (PRD §4).

Skipped (returns ``None``) when instrumentalness > 0.85. Otherwise estimates
pitch range/median (via pYIN), timbre brightness, roughness (pitch jitter), and
breathiness (noise-to-harmonic ratio in the vocal band).
"""

from __future__ import annotations

import librosa
import numpy as np

from src.models.identifiers import VocalCharacter

_EPS = 1e-9


def _norm(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.0
    return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))


def extract_vocal_character(
    y: np.ndarray, sr: int, instrumentalness: float
) -> VocalCharacter | None:
    if instrumentalness > 0.85 or len(y) == 0:
        return None

    # pYIN is expensive; run it on up to ~30s from the middle of the track.
    window = 30 * sr
    if len(y) > window:
        start = (len(y) - window) // 2
        segment = y[start : start + window]
    else:
        segment = y

    try:
        f0, _, _ = librosa.pyin(
            segment, fmin=80.0, fmax=1000.0, sr=sr
        )
    except Exception:
        return VocalCharacter()

    voiced = f0[~np.isnan(f0)]
    if voiced.size < 5:
        return VocalCharacter()

    centroid = float(np.mean(librosa.feature.spectral_centroid(y=segment, sr=sr)))
    jitter = float(np.mean(np.abs(np.diff(voiced)))) / (float(np.mean(voiced)) + _EPS)
    harmonic, percussive = librosa.effects.hpss(segment)
    h_energy = float(np.sum(harmonic**2))
    p_energy = float(np.sum(percussive**2))
    breathiness = p_energy / (h_energy + p_energy + _EPS)

    return VocalCharacter(
        pitch_range_low_hz=round(float(np.percentile(voiced, 5)), 1),
        pitch_range_high_hz=round(float(np.percentile(voiced, 95)), 1),
        pitch_median_hz=round(float(np.median(voiced)), 1),
        timbre_brightness=round(_norm(centroid, 500.0, 4000.0), 3),
        roughness=round(_norm(jitter, 0.0, 0.1), 3),
        breathiness=round(_norm(breathiness, 0.1, 0.6), 3),
    )
