"""Identifier 11 — Vocal Character (Phase 2).

Skipped when instrumentalness > 0.85. Otherwise isolates the vocal band and
extracts pitch range, timbre, roughness, and breathiness.
"""

from __future__ import annotations

from src.models.identifiers import VocalCharacter


def extract_vocal_character(y, sr, instrumentalness: float) -> VocalCharacter | None:
    raise NotImplementedError
