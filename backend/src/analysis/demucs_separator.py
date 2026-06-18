"""Demucs v4 source separation — htdemucs (4 stems), GPU/VRAM management, disk cache.

PRD addendum: use ``htdemucs`` by default (fast, reliable). Optional ``htdemucs_ft``
for higher quality. Do NOT use htdemucs_6s (piano bleeding).

Stems cached at ``{stem_cache_dir}/{track_id}/drums.wav`` etc.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from src.config import settings
from src.utils.ollama_vram import unload_ollama_models

logger = logging.getLogger("ultraviolet.demucs")

STEM_NAMES = ("drums", "bass", "other", "vocals")


@dataclass
class SeparatedStems:
    sr: int
    mix: np.ndarray
    drums: np.ndarray
    bass: np.ndarray
    other: np.ndarray
    vocals: np.ndarray


def _cache_dir(track_id: str) -> Path:
    return Path(settings.stem_cache_dir) / track_id


def _stem_to_mono(tensor) -> np.ndarray:
    arr = tensor.detach().cpu().numpy()
    if arr.ndim == 2:
        return arr.mean(axis=0).astype(np.float32)
    return np.asarray(arr, dtype=np.float32).flatten()


def _load_stem_wav(path: Path) -> np.ndarray:
    import soundfile as sf

    data, _ = sf.read(path, dtype="float32", always_2d=True)
    return data.mean(axis=1)


def _save_stem_wav(path: Path, mono: np.ndarray, sr: int) -> None:
    import soundfile as sf

    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, mono, sr)


def _load_audio(path: str, target_sr: int) -> tuple:
    """Load stereo audio for Demucs without torchaudio (avoids torchcodec on torch 2.11+)."""
    import librosa
    import torch

    from src.utils.audio_io import prepare_audio_path

    prepared, is_temp = prepare_audio_path(path)
    try:
        data, sr = librosa.load(prepared, sr=None, mono=False, dtype=np.float32)
    finally:
        if is_temp and os.path.exists(prepared):
            os.unlink(prepared)
    if data.ndim == 1:
        wav_np = np.stack([data, data])
    elif data.shape[0] == 1:
        wav_np = np.repeat(data, 2, axis=0)
    else:
        wav_np = data[:2]

    if sr != target_sr:
        wav_np = librosa.resample(wav_np, orig_sr=sr, target_sr=target_sr)

    wav = torch.from_numpy(np.ascontiguousarray(wav_np, dtype=np.float32))
    mix_mono = wav.mean(dim=0).numpy().astype(np.float32)
    return wav, target_sr, mix_mono


def _cuda_usable() -> bool:
    """True only if CUDA kernels can actually run (RTX 50-series needs PyTorch cu128)."""
    import torch

    if not torch.cuda.is_available():
        return False
    try:
        torch.zeros(1, device="cuda")
        return True
    except RuntimeError:
        return False


def _resolve_device(requested: str) -> str:
    if requested != "cuda":
        return requested
    if _cuda_usable():
        return "cuda"
    logger.warning(
        "CUDA GPU present but unusable with this PyTorch build "
        "(RTX 50-series / sm_120 needs torch 2.7+ cu128). Using CPU — slower but works."
    )
    return "cpu"


def _run_demucs(model_name: str, wav, device: str) -> dict[str, object]:
    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model

    model = get_model(model_name)
    model.to(device)
    model.eval()
    try:
        with torch.no_grad():
            sources = apply_model(
                model,
                wav[None].to(device),
                device=device,
                shifts=1,
                split=True,
                overlap=0.25,
                progress=False,
            )
    except RuntimeError as exc:
        if device != "cuda":
            raise
        logger.warning("Demucs CUDA failed (%s); retrying on CPU.", exc)
        device = "cpu"
        model.to(device)
        with torch.no_grad():
            sources = apply_model(
                model,
                wav[None].to(device),
                device=device,
                shifts=1,
                split=True,
                overlap=0.25,
                progress=False,
            )
    names = list(model.sources)
    out = {names[i]: sources[0, i] for i in range(len(names))}
    del model
    if device == "cuda":
        torch.cuda.empty_cache()
    return out


def separate_track(
    file_path: str,
    track_id: str,
    model_name: str | None = None,
) -> SeparatedStems:
    """Separate audio with Demucs; load from ``data/stems/{track_id}/`` when cached."""
    from demucs.pretrained import get_model

    unload_ollama_models()

    model_name = model_name or settings.demucs_model
    device = _resolve_device(settings.demucs_device)

    ref = get_model(model_name)
    sr = int(ref.samplerate)
    del ref

    cache = _cache_dir(track_id)
    if (cache / "drums.wav").exists():
        logger.info("Loading cached stems: %s", cache)
        return SeparatedStems(
            sr=sr,
            mix=_load_stem_wav(cache / "mix.wav") if (cache / "mix.wav").exists() else np.array([]),
            drums=_load_stem_wav(cache / "drums.wav"),
            bass=_load_stem_wav(cache / "bass.wav"),
            other=_load_stem_wav(cache / "other.wav"),
            vocals=_load_stem_wav(cache / "vocals.wav"),
        )

    wav, sr, mix_mono = _load_audio(file_path, sr)
    logger.info("Running Demucs %s on %s (%s)", model_name, file_path, device)
    stems = _run_demucs(model_name, wav, device)

    drums = _stem_to_mono(stems["drums"])
    bass = _stem_to_mono(stems["bass"])
    other = _stem_to_mono(stems["other"])
    vocals = _stem_to_mono(stems["vocals"])

    for name, mono in zip(STEM_NAMES, (drums, bass, other, vocals), strict=True):
        _save_stem_wav(cache / f"{name}.wav", mono, sr)
    _save_stem_wav(cache / "mix.wav", mix_mono, sr)

    return SeparatedStems(sr=sr, mix=mix_mono, drums=drums, bass=bass, other=other, vocals=vocals)
