"""Stem RMS energy → presence percentages and instrumentalness (PRD addendum)."""

from __future__ import annotations

import numpy as np

from src.models.identifiers import StemPresence

_EPS = 1e-9
_VOCAL_THRESHOLD_PCT = 5.0


def rms_energy(y: np.ndarray) -> float:
    if y is None or len(y) == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.asarray(y, dtype=np.float64) ** 2)))


def stem_energy_percentages(stems: dict[str, np.ndarray]) -> dict[str, float]:
    raw = {name: rms_energy(wave) for name, wave in stems.items()}
    total = sum(raw.values()) + _EPS
    return {name: round(energy / total * 100.0, 1) for name, energy in raw.items()}


def instrumentalness_from_vocals_pct(vocals_pct: float) -> float:
    if vocals_pct < _VOCAL_THRESHOLD_PCT:
        return 1.0
    return round(max(0.0, 1.0 - vocals_pct / 100.0), 3)


def build_stem_presence(pct: dict[str, float]) -> StemPresence:
    return StemPresence(
        drums_pct=pct.get("drums", 0.0),
        bass_pct=pct.get("bass", 0.0),
        other_pct=pct.get("other", 0.0),
        vocals_pct=pct.get("vocals", 0.0),
    )
