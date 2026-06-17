"""Pydantic schemas for DJ audio identifiers (11 reliable) and SOUL taste vector."""

from __future__ import annotations

from pydantic import BaseModel, Field


class LoudnessProfile(BaseModel):
    peak_db: float = 0.0
    rms_db: float = 0.0
    dynamic_range: float = 0.0
    crest_factor: float = 0.0


class StemPresence(BaseModel):
    """Demucs 4-stem RMS energy as % of total (PRD addendum)."""

    drums_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    bass_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    other_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    vocals_pct: float = Field(default=0.0, ge=0.0, le=100.0)


class EmotionalArc(BaseModel):
    values: list[float] = Field(default_factory=list)
    label: str = "Consistent intensity throughout"


class IdentifierVector(BaseModel):
    """11 reliable identifiers from Demucs stems + librosa on isolated stems."""

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
    stem_presence: StemPresence = Field(default_factory=StemPresence)
    emotional_arc: EmotionalArc = Field(default_factory=EmotionalArc)


class UserTasteVector(BaseModel):
    """SOUL preference weights (unchanged for profile/RAG)."""

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
