"""Audio file loading, format conversion, and validation.

``is_supported_format`` is pure-Python and usable now; ``load_audio`` defers to
librosa (Phase 2) and imports it lazily.
"""

from __future__ import annotations

from pathlib import Path

SUPPORTED_FORMATS: set[str] = {".mp3", ".flac", ".wav", ".ogg", ".m4a"}


def is_supported_format(filename: str) -> bool:
    return Path(filename).suffix.lower() in SUPPORTED_FORMATS


def load_audio(file_path: str, sr: int = 22050):
    """Load an audio file as a mono waveform at ``sr`` Hz (Phase 2)."""
    import librosa

    y, sample_rate = librosa.load(file_path, sr=sr, mono=True)
    return y, sample_rate
