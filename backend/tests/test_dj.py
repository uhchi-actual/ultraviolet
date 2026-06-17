"""DJ agent tests (Phase 2) — real librosa audio analysis."""

from __future__ import annotations

import asyncio

import numpy as np
import pytest

pytest.importorskip("librosa")
pytest.importorskip("soundfile")
pytest.importorskip("demucs")

import soundfile as sf  # noqa: E402

from src.agents.dj import DJ  # noqa: E402
from src.models.identifiers import IdentifierVector  # noqa: E402


def test_dj_analyzes_audio_file(tmp_path) -> None:
    sr = 22050
    t = np.linspace(0.0, 5.0, sr * 5, endpoint=False)
    y = (0.5 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
    path = tmp_path / "tone.wav"
    sf.write(str(path), y, sr)

    vector = asyncio.run(DJ().analyze(str(path)))

    assert isinstance(vector, IdentifierVector)
    assert 0 <= vector.key <= 11
    assert vector.mode in (0, 1)
    assert vector.tempo >= 0.0
    assert 0.0 <= vector.instrumentalness <= 1.0


def test_dj_missing_file_raises() -> None:
    with pytest.raises((FileNotFoundError, OSError)):
        asyncio.run(DJ().analyze("does-not-exist.wav"))
