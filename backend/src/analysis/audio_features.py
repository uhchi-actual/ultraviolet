"""Identifier extraction functions (PRD §4) built on librosa.

Each ``extract_*`` takes a mono waveform ``y`` and sample rate ``sr`` and returns
the corresponding identifier value. ``librosa``/``numpy`` are imported at module
level; this module is only imported lazily (from the analyze route / DJ agent),
so importing the app without the audio stack stays safe.

The values are signal-processing heuristics — good, explainable approximations
rather than perceptual ground truth (see PRD notes on valence).
"""

from __future__ import annotations

import librosa
import numpy as np

from src.models.identifiers import LoudnessProfile

_EPS = 1e-9

# Krumhansl–Schmuckler key profiles.
_MAJOR_PROFILE = np.array(
    [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
)
_MINOR_PROFILE = np.array(
    [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
)


def _norm(value: float, lo: float, hi: float) -> float:
    """Min-max normalize ``value`` into 0-1, clipped."""
    if hi <= lo:
        return 0.0
    return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))


def _clip01(value: float) -> float:
    return float(np.clip(value, 0.0, 1.0))


def _pearson(a: np.ndarray, b: np.ndarray) -> float:
    a = a - a.mean()
    b = b - b.mean()
    denom = np.sqrt(np.sum(a * a) * np.sum(b * b)) + _EPS
    return float(np.sum(a * b) / denom)


def _mean_chroma(y: np.ndarray, sr: int) -> np.ndarray:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    return chroma.mean(axis=1)


def _estimate_tempo(onset_env: np.ndarray, sr: int) -> float:
    """Tempo estimate that works across librosa 0.10/0.11 API changes."""
    try:
        tempo_fn = librosa.feature.rhythm.tempo
    except AttributeError:
        tempo_fn = librosa.beat.tempo
    value = tempo_fn(onset_envelope=onset_env, sr=sr, aggregate=np.median)
    return float(np.atleast_1d(value)[0])


def estimate_key_mode(chroma_mean: np.ndarray) -> tuple[int, int, float, float]:
    """Return (key 0-11, mode 0/1, best_major_corr, best_minor_corr)."""
    major_corrs = [_pearson(np.roll(chroma_mean, -i), _MAJOR_PROFILE) for i in range(12)]
    minor_corrs = [_pearson(np.roll(chroma_mean, -i), _MINOR_PROFILE) for i in range(12)]
    best_major = float(np.max(major_corrs))
    best_minor = float(np.max(minor_corrs))
    if best_major >= best_minor:
        return int(np.argmax(major_corrs)), 1, best_major, best_minor
    return int(np.argmax(minor_corrs)), 0, best_major, best_minor


def extract_key_mode(y: np.ndarray, sr: int) -> tuple[int, int]:  # Identifier 6
    key, mode, _, _ = estimate_key_mode(_mean_chroma(y, sr))
    return key, mode


def extract_tempo(y: np.ndarray, sr: int) -> float:  # Identifier 5
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    return round(_estimate_tempo(onset_env, sr), 2)


def extract_energy(y: np.ndarray, sr: int) -> float:  # Identifier 2
    rms = float(np.mean(librosa.feature.rms(y=y)))
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_rate = float(np.mean(onset_env))
    energy = (
        0.5 * _norm(rms, 0.0, 0.2)
        + 0.3 * _norm(centroid, 500.0, 5000.0)
        + 0.2 * _norm(onset_rate, 0.0, 5.0)
    )
    return _clip01(energy)


def extract_valence(y: np.ndarray, sr: int) -> float:  # Identifier 1
    chroma_mean = _mean_chroma(y, sr)
    _, mode, major_corr, minor_corr = estimate_key_mode(chroma_mean)
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo = _estimate_tempo(onset_env, sr)
    mode_score = 1.0 if mode == 1 else 0.0
    tonal_lean = _norm(major_corr - minor_corr, -0.3, 0.3)
    valence = (
        0.35 * mode_score
        + 0.2 * tonal_lean
        + 0.3 * _norm(centroid, 800.0, 4000.0)
        + 0.15 * _norm(tempo, 60.0, 160.0)
    )
    return _clip01(valence)


def extract_danceability(y: np.ndarray, sr: int) -> float:  # Identifier 3
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, onset_envelope=onset_env)
    tempo = float(np.atleast_1d(tempo)[0])

    if len(beats) > 2:
        ibi = np.diff(librosa.frames_to_time(beats, sr=sr))
        regularity = 1.0 - _norm(float(np.std(ibi)) / (float(np.mean(ibi)) + _EPS), 0.0, 1.0)
    else:
        regularity = 0.0

    pulse = librosa.beat.plp(onset_envelope=onset_env, sr=sr)
    pulse_clarity = _norm(float(np.mean(pulse)), 0.0, 0.3)
    tempo_fit = float(np.exp(-(((tempo - 118.0) / 45.0) ** 2)))

    dance = 0.45 * regularity + 0.3 * pulse_clarity + 0.25 * tempo_fit
    return _clip01(dance)


def extract_acousticness(y: np.ndarray, sr: int) -> float:  # Identifier 4
    rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))
    harmonic, percussive = librosa.effects.hpss(y)
    hnr = float(np.sum(harmonic**2) / (np.sum(percussive**2) + _EPS))

    acoustic = (
        0.4 * (1.0 - _norm(rolloff, 1500.0, 6000.0))
        + 0.35 * _norm(hnr, 0.5, 4.0)
        + 0.25 * (1.0 - _norm(flatness, 0.01, 0.3))
    )
    return _clip01(acoustic)


def extract_instrumentalness(y: np.ndarray, sr: int) -> float:  # Identifier 7
    stft = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    band = (freqs >= 300.0) & (freqs <= 3400.0)
    band_energy = stft[band].sum(axis=0)
    total_energy = stft.sum(axis=0) + _EPS
    ratio = band_energy / total_energy
    vocal_activity = 0.5 * _norm(float(np.mean(ratio)), 0.2, 0.6) + 0.5 * _norm(
        float(np.std(ratio)), 0.02, 0.15
    )
    return _clip01(1.0 - vocal_activity)


def extract_loudness_profile(y: np.ndarray, sr: int) -> LoudnessProfile:  # Identifier 8
    peak = float(np.max(np.abs(y))) + _EPS
    rms = float(np.sqrt(np.mean(y**2))) + _EPS
    peak_db = 20.0 * np.log10(peak)
    rms_db = 20.0 * np.log10(rms)
    return LoudnessProfile(
        peak_db=round(peak_db, 2),
        rms_db=round(rms_db, 2),
        dynamic_range=round(peak_db - rms_db, 2),
        crest_factor=round(peak / rms, 2),
    )


def extract_texture_density(y: np.ndarray, sr: int) -> float:  # Identifier 9
    bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))
    contrast = float(np.mean(librosa.feature.spectral_contrast(y=y, sr=sr)))
    density = (
        0.4 * _norm(bandwidth, 1000.0, 4000.0)
        + 0.3 * _norm(flatness, 0.01, 0.3)
        + 0.3 * (1.0 - _norm(contrast, 12.0, 30.0))
    )
    return _clip01(density)


def extract_rhythmic_complexity(y: np.ndarray, sr: int) -> float:  # Identifier 12
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units="time")
    if len(onsets) <= 3:
        return 0.0
    ioi = np.diff(onsets)
    hist, _ = np.histogram(ioi, bins=12, density=False)
    p = hist / (hist.sum() + _EPS)
    p = p[p > 0]
    entropy = -np.sum(p * np.log(p)) / (np.log(len(p)) + _EPS) if len(p) > 1 else 0.0
    return _clip01(float(entropy))


def extract_production_aesthetic(y: np.ndarray, sr: int) -> float:  # Identifier 13
    rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    stft = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    hf = stft[freqs >= 5000.0].sum()
    hf_ratio = float(hf / (stft.sum() + _EPS))
    aesthetic = 0.5 * _norm(rolloff, 2000.0, 8000.0) + 0.5 * _norm(hf_ratio, 0.01, 0.2)
    return _clip01(aesthetic)


def extract_harmonic_darkness(y: np.ndarray, sr: int) -> float:  # Identifier 14
    chroma_mean = _mean_chroma(y, sr)
    _, mode, major_corr, minor_corr = estimate_key_mode(chroma_mean)
    minor_lean = _norm(minor_corr - major_corr, -0.3, 0.3)

    stft = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    low = stft[freqs < 250.0].sum()
    low_emphasis = _norm(float(low / (stft.sum() + _EPS)), 0.1, 0.5)

    darkness = 0.45 * minor_lean + 0.25 * (1.0 if mode == 0 else 0.0) + 0.3 * low_emphasis
    return _clip01(darkness)
