"""Identifiers 1-8 extraction functions (Phase 2).

Each function takes a loaded waveform ``y`` and sample rate ``sr`` and returns
the corresponding identifier value. Implementations land in Phase 2.
"""

from __future__ import annotations

from src.models.identifiers import LoudnessProfile


def extract_valence(y, sr) -> float:  # Identifier 1
    raise NotImplementedError


def extract_energy(y, sr) -> float:  # Identifier 2
    raise NotImplementedError


def extract_danceability(y, sr) -> float:  # Identifier 3
    raise NotImplementedError


def extract_acousticness(y, sr) -> float:  # Identifier 4
    raise NotImplementedError


def extract_tempo(y, sr) -> float:  # Identifier 5
    raise NotImplementedError


def extract_key_mode(y, sr) -> tuple[int, int]:  # Identifier 6
    raise NotImplementedError


def extract_instrumentalness(y, sr) -> float:  # Identifier 7
    raise NotImplementedError


def extract_loudness_profile(y, sr) -> LoudnessProfile:  # Identifier 8
    raise NotImplementedError
