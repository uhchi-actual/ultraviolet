"""Demucs source separation — htdemucs_ft (4 stems) + htdemucs_6s (guitar/piano).

Stems are cached under ``data/stems/<file-hash>/`` for reuse. Ollama models are
unloaded before GPU separation to avoid VRAM conflicts.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from src.config import settings
from src.utils.ollama_vram import unload_ollama_models

logger = logging.getLogger("ultraviolet.demucs")

_FT_MODEL = "htdemucs_ft"
_6S_MODEL = "htdemucs_6s"


@dataclass
class SeparatedStems:
    """Mono waveforms per Demucs stem at ``sr`` Hz."""

    sr: int
    mix: np.ndarray
    drums: np.ndarray
    bass: np.ndarray
    other: np.ndarray
    vocals: np.ndarray
    guitar: np.ndarray | None = None
    piano: np.ndarray | None = None


def _file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def _cache_dir(path: str, model: str) -> Path:
    base = Path(settings.stem_cache_dir)
    return base / _file_hash(path) / model


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


def _load_mix(path: str, target_sr: int) -> tuple:
    import torchaudio

    wav, sr = torchaudio.load(path)
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)
    elif wav.shape[0] > 2:
        wav = wav[:2]
    if sr != target_sr:
        wav = torchaudio.functional.resample(wav, sr, target_sr)
    mix_mono = wav.mean(dim=0).numpy().astype(np.float32)
    return wav, target_sr, mix_mono


def _run_demucs(model_name: str, wav, device: str):
    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model

    model = get_model(model_name)
    model.to(device)
    model.eval()
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
        import torch

        torch.cuda.empty_cache()
    return out, names


def separate_track(file_path: str) -> SeparatedStems:
    """Separate ``file_path`` into stems via Demucs; use disk cache when present."""
    import torch

    unload_ollama_models()

    device = settings.demucs_device
    if device == "cuda" and not torch.cuda.is_available():
        logger.warning("CUDA requested but unavailable; falling back to CPU.")
        device = "cpu"

    from demucs.pretrained import get_model

    ft = get_model(_FT_MODEL)
    sr = int(ft.samplerate)
    del ft

    wav, sr, mix_mono = _load_mix(file_path, sr)
    cache_ft = _cache_dir(file_path, _FT_MODEL)

    if (cache_ft / "drums.wav").exists():
        logger.info("Loading cached Demucs stems from %s", cache_ft)
        drums = _load_stem_wav(cache_ft / "drums.wav")
        bass = _load_stem_wav(cache_ft / "bass.wav")
        other = _load_stem_wav(cache_ft / "other.wav")
        vocals = _load_stem_wav(cache_ft / "vocals.wav")
    else:
        logger.info("Running Demucs %s on %s (%s)", _FT_MODEL, file_path, device)
        stems_ft, _ = _run_demucs(_FT_MODEL, wav, device)
        drums = _stem_to_mono(stems_ft["drums"])
        bass = _stem_to_mono(stems_ft["bass"])
        other = _stem_to_mono(stems_ft["other"])
        vocals = _stem_to_mono(stems_ft["vocals"])
        for name, mono in (
            ("drums", drums),
            ("bass", bass),
            ("other", other),
            ("vocals", vocals),
        ):
            _save_stem_wav(cache_ft / f"{name}.wav", mono, sr)

    cache_6s = _cache_dir(file_path, _6S_MODEL)
    guitar: np.ndarray | None = None
    piano: np.ndarray | None = None

    if (cache_6s / "guitar.wav").exists():
        guitar = _load_stem_wav(cache_6s / "guitar.wav")
        piano = _load_stem_wav(cache_6s / "piano.wav")
    else:
        logger.info("Running Demucs %s for guitar/piano (%s)", _6S_MODEL, device)
        stems_6s, names_6s = _run_demucs(_6S_MODEL, wav, device)
        if "guitar" in names_6s:
            guitar = _stem_to_mono(stems_6s["guitar"])
            _save_stem_wav(cache_6s / "guitar.wav", guitar, sr)
        if "piano" in names_6s:
            piano = _stem_to_mono(stems_6s["piano"])
            _save_stem_wav(cache_6s / "piano.wav", piano, sr)

    return SeparatedStems(
        sr=sr,
        mix=mix_mono,
        drums=drums,
        bass=bass,
        other=other,
        vocals=vocals,
        guitar=guitar,
        piano=piano,
    )
