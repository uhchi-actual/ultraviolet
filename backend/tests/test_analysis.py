"""Phase 2/3 — DJ pipeline tests (librosa + stem analysis, no Demucs GPU required)."""

from __future__ import annotations

import numpy as np
import pytest

pytest.importorskip("librosa")

from src.analysis.audio_features import extract_key_mode, harmonic_chroma_mean  # noqa: E402
from src.analysis.demucs_separate import SeparatedStems  # noqa: E402
from src.analysis.identifiers import analyze_stems  # noqa: E402
from src.models.identifiers import IdentifierVector  # noqa: E402
from src.utils.audio_io import downsample_waveform  # noqa: E402

SR = 22050


def _note(freq: float, dur: float, amp: float) -> np.ndarray:
    t = np.linspace(0.0, dur, int(SR * dur), endpoint=False)
    return amp * (
        np.sin(2 * np.pi * freq * t)
        + 0.5 * np.sin(2 * np.pi * 2 * freq * t)
        + 0.25 * np.sin(2 * np.pi * 3 * freq * t)
    )


def _scale(root_hz: float, steps: list[int]) -> np.ndarray:
    sequence = [0, *steps, 0]
    segments = [
        _note(root_hz * 2 ** (st / 12.0), 0.45, 0.95 if st == 0 else 0.6) for st in sequence
    ]
    y = np.concatenate(segments).astype(np.float32)
    return y / np.max(np.abs(y)) * 0.9


def _stems_from_harmonic(y: np.ndarray) -> SeparatedStems:
    """Approximate stems for unit tests without running Demucs."""
    n = len(y)
    t = np.linspace(0, 1, n, endpoint=False)
    drums = (0.3 * y * (np.sin(2 * np.pi * 8 * t) > 0)).astype(np.float32)
    bass = (0.5 * y).astype(np.float32)
    other = (0.5 * y).astype(np.float32)
    vocals = np.zeros(n, dtype=np.float32)
    return SeparatedStems(sr=SR, mix=y, drums=drums, bass=bass, other=other, vocals=vocals)


def test_analyze_stems_returns_valid_vector() -> None:
    y = _scale(220.0, [2, 3, 5, 7, 8, 10])
    vector = analyze_stems(_stems_from_harmonic(y))

    assert isinstance(vector, IdentifierVector)
    assert 0.0 <= vector.energy <= 1.0
    assert 0.0 <= vector.danceability <= 1.0
    assert vector.instrumentalness == 1.0
    assert vector.tempo >= 0.0
    assert 0 <= vector.key <= 11
    assert vector.mode in (0, 1)
    assert vector.stem_profile.vocals_presence < 5.0


@pytest.mark.parametrize(
    ("root_hz", "steps", "expected"),
    [
        (261.63, [2, 4, 5, 7, 9, 11], (0, 1)),
        (196.00, [2, 4, 5, 7, 9, 11], (7, 1)),
        (220.00, [2, 3, 5, 7, 8, 10], (9, 0)),
        (164.81, [2, 3, 5, 7, 8, 10], (4, 0)),
        (146.83, [2, 3, 5, 7, 8, 10], (2, 0)),
    ],
)
def test_key_detection_known_scales(
    root_hz: float, steps: list[int], expected: tuple[int, int]
) -> None:
    y = _scale(root_hz, steps)
    chroma = harmonic_chroma_mean(y, SR)
    assert extract_key_mode(y, SR, chroma) == expected


def test_downsample_waveform_normalized() -> None:
    rng = np.random.RandomState(0)
    waveform = downsample_waveform(rng.randn(50_000).astype(np.float32), points=200)

    assert len(waveform) == 200
    assert 0.0 <= min(waveform)
    assert max(waveform) <= 1.0
