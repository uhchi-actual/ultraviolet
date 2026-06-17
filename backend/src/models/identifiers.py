"""Pydantic schemas for DJ audio identifiers and the SOUL user taste vector.

The DJ fingerprint uses only identifiers we can back with Demucs stem separation
or reliable full-mix signal processing. Deferred fields (valence, acousticness,
vocal character, production aesthetic) are omitted from ``IdentifierVector``.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class LoudnessProfile(BaseModel):
    """Peak, RMS, dynamic range, crest factor on the full mix."""

    peak_db: float = 0.0
    rms_db: float = 0.0
    dynamic_range: float = 0.0
    crest_factor: float = 0.0


class StemProfile(BaseModel):
    """Demucs stem energy as % of total RMS energy (0–100 each)."""

    drums_presence: float = Field(default=0.0, ge=0.0, le=100.0)
    bass_presence: float = Field(default=0.0, ge=0.0, le=100.0)
    vocals_presence: float = Field(default=0.0, ge=0.0, le=100.0)
    other_presence: float = Field(default=0.0, ge=0.0, le=100.0)
    guitar_presence: float = Field(default=0.0, ge=0.0, le=100.0)
    piano_presence: float = Field(default=0.0, ge=0.0, le=100.0)


class EmotionalArc(BaseModel):
    """Quarter-by-quarter intensity; empty values when variation is negligible."""

    values: list[float] = Field(default_factory=list)
    label: str = "Consistent throughout"


class IdentifierVector(BaseModel):
    """Accurate audio fingerprint from Demucs stems + reliable librosa features."""

    tempo: float = Field(default=0.0, ge=0.0)
    key: int = Field(default=0, ge=0, le=11)
    mode: int = Field(default=0, ge=0, le=1)
    energy: float = Field(default=0.0, ge=0.0, le=1.0)
    danceability: float = Field(default=0.0, ge=0.0, le=1.0)
    instrumentalness: float = Field(default=0.0, ge=0.0, le=1.0)
    loudness_profile: LoudnessProfile = Field(default_factory=LoudnessProfile)
    texture_density: float = Field(default=0.0, ge=0.0, le=1.0)
    rhythmic_complexity: float = Field(default=0.0, ge=0.0, le=1.0)
    harmonic_darkness: float = Field(default=0.0, ge=0.0, le=1.0)
    stem_profile: StemProfile = Field(default_factory=StemProfile)
    emotional_arc: EmotionalArc = Field(default_factory=EmotionalArc)


class UserTasteVector(BaseModel):
    """SOUL's 15-dimensional preference weights (unchanged for profile/RAG)."""

    valence_weight: float = 1.0
    energy_weight: float = 1.0
    danceability_weight: float = 1.0
    acousticness_weight: float = 1.0
    tempo_weight: float = 1.0
    key_mode_weight: float = 1.0
    instrumentalness_weight: float = 1.0
    loudness_weight: float = 1.0
    texture_density_weight: float = 1.0
    emotional_arc_weight: float = 1.0
    vocal_character_weight: float = 1.0
    rhythmic_complexity_weight: float = 1.0
    production_aesthetic_weight: float = 1.0
    harmonic_darkness_weight: float = 1.0
    instrumentation_weight: float = 1.0
