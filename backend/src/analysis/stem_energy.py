"""Stem RMS energy → presence percentages and instrumentalness."""

from __future__ import annotations

import numpy as np

from src.models.identifiers import StemProfile

_EPS = 1e-9
_VOCAL_INSTRUMENTAL_THRESHOLD = 5.0  # % of total energy


def rms_energy(y: np.ndarray) -> float:
    if y is None or len(y) == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.asarray(y, dtype=np.float64) ** 2)))


def stem_energy_percentages(stems: dict[str, np.ndarray]) -> dict[str, float]:
    """Return each stem's share of total RMS energy as 0–100."""
    raw = {name: rms_energy(wave) for name, wave in stems.items()}
    total = sum(raw.values()) + _EPS
    return {name: round(energy / total * 100.0, 1) for name, energy in raw.items()}


def instrumentalness_from_vocals_pct(vocals_pct: float) -> float:
    """If vocals < 5% of total energy → instrumental (1.0)."""
    if vocals_pct < _VOCAL_INSTRUMENTAL_THRESHOLD:
        return 1.0
    return round(max(0.0, 1.0 - vocals_pct / 100.0), 3)


def build_stem_profile(pct: dict[str, float]) -> StemProfile:
    return StemProfile(
        drums_presence=pct.get("drums", 0.0),
        bass_presence=pct.get("bass", 0.0),
        vocals_presence=pct.get("vocals", 0.0),
        other_presence=pct.get("other", 0.0),
        guitar_presence=pct.get("guitar", 0.0),
        piano_presence=pct.get("piano", 0.0),
    )
