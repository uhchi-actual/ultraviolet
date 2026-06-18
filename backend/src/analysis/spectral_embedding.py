"""CQT chroma + MFCC spectral embedding for local fingerprint matching.

Based on standard MIR practice: chroma captures harmonic content (pitch class
profile); MFCCs capture timbral envelope. Together they form a compact embedding
suitable for cosine nearest-neighbor retrieval (see Müller et al., IEEE SPM 2019).
"""

from __future__ import annotations

import librosa
import numpy as np

_EMBEDDING_DIM = 25  # 12 chroma + 13 mfcc means


def extract_spectral_embedding(y: np.ndarray, sr: int) -> list[float]:
    """Return L2-normalized 25-dim embedding (12 chroma CQT + 13 MFCC means)."""
    if y is None or len(y) < sr // 4:
        return [0.0] * _EMBEDDING_DIM

    y_h = librosa.effects.harmonic(y, margin=3.0)
    chroma = librosa.feature.chroma_cqt(y=y_h, sr=sr)
    chroma_mean = chroma.mean(axis=1)

    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = mfcc.mean(axis=1)

    vec = np.concatenate([chroma_mean, mfcc_mean]).astype(np.float64)
    norm = float(np.linalg.norm(vec))
    if norm > 1e-9:
        vec = vec / norm
    return [round(float(v), 6) for v in vec]


def embedding_dimension() -> int:
    return _EMBEDDING_DIM
