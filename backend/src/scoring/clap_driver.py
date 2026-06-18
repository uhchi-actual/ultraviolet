"""CLAP embedding driver — laion/larger_clap_music via HuggingFace transformers."""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any

import numpy as np

from src.config import settings

logger = logging.getLogger("ultraviolet.clap")

CLAP_MODEL_ID = "laion/larger_clap_music"
CLAP_SAMPLE_RATE = 48_000


def _configure_cache() -> None:
    cache = str(settings.torch_cache_dir)
    os.environ.setdefault("HF_HOME", cache)
    os.environ.setdefault("TRANSFORMERS_CACHE", cache)
    os.environ.setdefault("TORCH_HOME", cache)


@lru_cache(maxsize=1)
def _load_clap():
    _configure_cache()
    import torch
    from transformers import ClapModel, ClapProcessor

    device = "cuda" if torch.cuda.is_available() and settings.demucs_device == "cuda" else "cpu"
    processor = ClapProcessor.from_pretrained(CLAP_MODEL_ID)
    model = ClapModel.from_pretrained(CLAP_MODEL_ID).to(device)
    model.eval()
    logger.info("Loaded CLAP model on %s", device)
    return processor, model, device


def unload_clap() -> None:
    """Free GPU memory held by the cached CLAP model."""
    _load_clap.cache_clear()
    try:
        import gc

        import torch

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass


def embed_audio(audio_array: np.ndarray, sr: int = CLAP_SAMPLE_RATE) -> list[float]:
    """Encode audio to a 512-dim CLAP embedding."""
    import torch

    processor, model, device = _load_clap()
    if audio_array.ndim > 1:
        audio_array = np.mean(audio_array, axis=0)
    if sr != CLAP_SAMPLE_RATE:
        import librosa

        audio_array = librosa.resample(audio_array.astype(np.float32), orig_sr=sr, target_sr=CLAP_SAMPLE_RATE)

    inputs = processor(audios=audio_array, sampling_rate=CLAP_SAMPLE_RATE, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        features = model.get_audio_features(**inputs)
    vec = features[0].detach().cpu().numpy().astype(np.float32)
    norm = float(np.linalg.norm(vec))
    if norm > 1e-9:
        vec = vec / norm
    return vec.tolist()


def embed_audio_file(file_path: str) -> list[float]:
    import librosa

    y, sr = librosa.load(file_path, sr=CLAP_SAMPLE_RATE, mono=True)
    return embed_audio(y, sr)


def embed_text(description: str) -> list[float]:
    """Encode text to the shared 512-dim CLAP space."""
    import torch

    processor, model, device = _load_clap()
    inputs = processor(text=[description], return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        features = model.get_text_features(**inputs)
    vec = features[0].detach().cpu().numpy().astype(np.float32)
    norm = float(np.linalg.norm(vec))
    if norm > 1e-9:
        vec = vec / norm
    return vec.tolist()


def clap_similarity(embed_a: list[float] | np.ndarray, embed_b: list[float] | np.ndarray) -> float:
    """Cosine similarity between two CLAP embeddings."""
    a = np.asarray(embed_a, dtype=np.float32)
    b = np.asarray(embed_b, dtype=np.float32)
    if a.size == 0 or b.size == 0:
        return 0.0
    dot = float(np.dot(a, b))
    return max(0.0, min(1.0, dot))
