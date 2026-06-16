"""Phase 2 — DJ audio-analysis pipeline tests.

These require the audio stack (librosa). They are skipped automatically where it
isn't installed (e.g. the lean CI image), and run in the backend container and
local dev env where ``.[audio]`` is present.
"""

from __future__ import annotations

import numpy as np
import pytest

pytest.importorskip("librosa")

from src.analysis.identifiers import analyze_waveform  # noqa: E402
from src.models.identifiers import IdentifierVector  # noqa: E402
from src.utils.audio_io import downsample_waveform  # noqa: E402

SR = 22050


def _rising_tone(seconds: float = 6.0, freq: float = 220.0) -> np.ndarray:
    t = np.linspace(0.0, seconds, int(SR * seconds), endpoint=False)
    sig = 0.5 * np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(2 * np.pi * 2 * freq * t)
    envelope = np.linspace(0.3, 1.0, sig.size)
    return (sig * envelope).astype(np.float32)


def test_analyze_waveform_returns_valid_vector() -> None:
    vector = analyze_waveform(_rising_tone(), SR)

    assert isinstance(vector, IdentifierVector)
    scalars = [
        vector.valence,
        vector.energy,
        vector.danceability,
        vector.acousticness,
        vector.instrumentalness,
        vector.texture_density,
        vector.rhythmic_complexity,
        vector.production_aesthetic,
        vector.harmonic_darkness,
    ]
    assert all(0.0 <= value <= 1.0 for value in scalars)
    assert vector.tempo >= 0.0
    assert 0 <= vector.key <= 11
    assert vector.mode in (0, 1)


def test_emotional_arc_shape_and_trend() -> None:
    vector = analyze_waveform(_rising_tone(), SR)

    assert len(vector.emotional_arc) == 4
    assert all(0.0 <= point <= 1.0 for point in vector.emotional_arc)
    # The rising amplitude envelope should make the end no quieter than the start.
    assert vector.emotional_arc[-1] >= vector.emotional_arc[0]


def test_instrumentation_profile_has_12_categories() -> None:
    profile = analyze_waveform(_rising_tone(), SR).instrumentation_profile.model_dump()

    assert len(profile) == 12
    assert all(0.0 <= value <= 1.0 for value in profile.values())


def test_downsample_waveform_normalized() -> None:
    rng = np.random.RandomState(0)
    waveform = downsample_waveform(rng.randn(50_000).astype(np.float32), points=200)

    assert len(waveform) == 200
    assert 0.0 <= min(waveform)
    assert max(waveform) <= 1.0
