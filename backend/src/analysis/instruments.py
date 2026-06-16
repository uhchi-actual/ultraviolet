"""Identifier 15 — Instrumentation Profile (PRD §4).

Phase 2 uses librosa spectral-band + HPSS heuristics to estimate the presence
(0-1) of 12 instrument categories. This is an explainable approximation; the
essentia instrument-classification models are an optional later upgrade.
"""

from __future__ import annotations

import librosa
import numpy as np

from src.models.identifiers import InstrumentationProfile

_EPS = 1e-9


def _norm(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.0
    return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))


def extract_instrumentation_profile(y: np.ndarray, sr: int) -> InstrumentationProfile:
    if len(y) == 0:
        return InstrumentationProfile()

    stft = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    total = float(stft.sum()) + _EPS

    def band(lo: float, hi: float) -> float:
        return float(stft[(freqs >= lo) & (freqs < hi)].sum() / total)

    sub = band(20.0, 120.0)
    low = band(120.0, 300.0)
    low_mid = band(300.0, 800.0)
    mid = band(800.0, 2500.0)
    high = band(2500.0, 6000.0)
    air = band(6000.0, sr / 2.0)

    harmonic, percussive = librosa.effects.hpss(y)
    h_energy = float(np.sum(harmonic**2))
    p_energy = float(np.sum(percussive**2))
    perc_ratio = p_energy / (h_energy + p_energy + _EPS)
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))
    contrast = float(np.mean(librosa.feature.spectral_contrast(y=y, sr=sr)))
    tonalness = 1.0 - _norm(flatness, 0.01, 0.3)

    bass = _norm(sub + low, 0.05, 0.45)
    drums = _norm(perc_ratio, 0.2, 0.7)
    mid_tonal = _norm(mid, 0.1, 0.45) * tonalness
    body_tonal = _norm(low_mid + mid, 0.1, 0.5) * tonalness
    clean = 1.0 - _norm(flatness, 0.05, 0.3)

    return InstrumentationProfile(
        synth=round(_clip(_norm(high + air, 0.05, 0.4) * _norm(flatness, 0.02, 0.25)), 3),
        electric_guitar=round(_clip(mid_tonal * (1.0 - perc_ratio)), 3),
        acoustic_guitar=round(_clip(body_tonal * clean), 3),
        drums_electronic=round(_clip(drums * _norm(sub, 0.02, 0.25)), 3),
        drums_acoustic=round(_clip(drums * _norm(contrast, 12.0, 30.0)), 3),
        bass_synth=round(_clip(bass * _norm(flatness, 0.05, 0.3)), 3),
        bass_electric=round(_clip(bass * tonalness), 3),
        piano_keys=round(_clip(body_tonal), 3),
        strings_orchestral=round(_clip(mid_tonal * (1.0 - drums)), 3),
        brass_winds=round(_clip(_norm(mid + high, 0.1, 0.45) * tonalness * 0.7), 3),
        vocals=0.0,  # set from (1 - instrumentalness) by the orchestrator
        noise_texture=round(_norm(flatness, 0.05, 0.4), 3),
    )


def _clip(value: float) -> float:
    return float(np.clip(value, 0.0, 1.0))
