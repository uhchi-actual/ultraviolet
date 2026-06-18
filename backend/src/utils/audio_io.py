"""Audio file loading, format conversion, and validation.

``is_supported_format`` is pure-Python and usable now; ``load_audio`` defers to
librosa (Phase 2) and imports it lazily.
"""

from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger("ultraviolet.audio_io")

SUPPORTED_FORMATS: set[str] = {".mp3", ".flac", ".wav", ".ogg", ".m4a", ".webm", ".mkv"}
NEEDS_TRANSCODE: set[str] = {".webm", ".mkv", ".m4a"}


def is_supported_format(filename: str) -> bool:
    return Path(filename).suffix.lower() in SUPPORTED_FORMATS


def _ffmpeg_exe() -> str | None:
    import shutil

    system = shutil.which("ffmpeg")
    if system:
        return system
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def transcode_to_wav(src_path: str) -> str:
    """Transcode webm/mkv/m4a to a temporary wav via ffmpeg."""
    ffmpeg = _ffmpeg_exe()
    if not ffmpeg:
        raise RuntimeError(
            "Cannot decode this format. Install ffmpeg or reinstall backend audio deps "
            "(pip install imageio-ffmpeg)."
        )
    fd, dst = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        src_path,
        "-ar",
        "44100",
        "-ac",
        "2",
        dst,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        os.unlink(dst)
        stderr = (exc.stderr or "").strip()
        raise RuntimeError(stderr or "ffmpeg transcode failed") from exc
    return dst


def prepare_audio_path(file_path: str) -> tuple[str, bool]:
    """Return a path librosa/soundfile can read. Second value = temp file to delete."""
    suffix = Path(file_path).suffix.lower()
    if suffix not in NEEDS_TRANSCODE:
        return file_path, False
    logger.info("Transcoding %s for analysis", suffix)
    return transcode_to_wav(file_path), True


def load_audio(file_path: str, sr: int = 22050):
    """Load an audio file as a mono waveform at ``sr`` Hz."""
    import librosa

    prepared, is_temp = prepare_audio_path(file_path)
    try:
        y, sample_rate = librosa.load(prepared, sr=sr, mono=True)
        return y, sample_rate
    except Exception as exc:
        msg = str(exc).strip() or repr(exc)
        raise RuntimeError(f"Could not read audio file ({msg})") from exc
    finally:
        if is_temp and os.path.exists(prepared):
            os.unlink(prepared)


def downsample_waveform(y, points: int = 400) -> list[float]:
    """Reduce a waveform to ``points`` normalized peak amplitudes for plotting."""
    import numpy as np

    if y is None or len(y) == 0:
        return []
    n = min(points, len(y))
    buckets = np.array_split(np.abs(y), n)
    peaks = np.array([float(b.max()) if b.size else 0.0 for b in buckets])
    peak_max = float(peaks.max()) or 1.0
    return [round(float(p / peak_max), 4) for p in peaks]
