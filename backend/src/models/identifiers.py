"""Pydantic schemas for the 15 audio identifiers and the user taste vector.

These are intentionally dependency-light (pure Pydantic) so they can be imported
anywhere in the backend without pulling the audio/agent stacks.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class LoudnessProfile(BaseModel):
    """Identifier 8 — dynamic loudness character."""

    peak_db: float = 0.0
    rms_db: float = 0.0
    dynamic_range: float = 0.0
    crest_factor: float = 0.0


class VocalCharacter(BaseModel):
    """Identifier 11 — vocal timbre (null when instrumentalness is high)."""

    pitch_range_low_hz: float | None = None
    pitch_range_high_hz: float | None = None
    pitch_median_hz: float | None = None
    timbre_brightness: float | None = None
    roughness: float | None = None
    breathiness: float | None = None


class InstrumentationProfile(BaseModel):
    """Identifier 15 — 12 instrument categories, each 0.0-1.0."""

    synth: float = 0.0
    electric_guitar: float = 0.0
    acoustic_guitar: float = 0.0
    drums_electronic: float = 0.0
    drums_acoustic: float = 0.0
    bass_synth: float = 0.0
    bass_electric: float = 0.0
    piano_keys: float = 0.0
    strings_orchestral: float = 0.0
    brass_winds: float = 0.0
    vocals: float = 0.0
    noise_texture: float = 0.0


class IdentifierVector(BaseModel):
    """The full 15-identifier audio fingerprint for a track."""

    # ── Sonic foundation (1-8) ──
    valence: float = Field(default=0.0, ge=0.0, le=1.0)
    energy: float = Field(default=0.0, ge=0.0, le=1.0)
    danceability: float = Field(default=0.0, ge=0.0, le=1.0)
    acousticness: float = Field(default=0.0, ge=0.0, le=1.0)
    tempo: float = Field(default=0.0, ge=0.0)
    key: int = Field(default=0, ge=0, le=11)
    mode: int = Field(default=0, ge=0, le=1)
    instrumentalness: float = Field(default=0.0, ge=0.0, le=1.0)
    loudness_profile: LoudnessProfile = Field(default_factory=LoudnessProfile)

    # ── Custom niche identifiers (9-15) ──
    texture_density: float = Field(default=0.0, ge=0.0, le=1.0)
    emotional_arc: list[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    vocal_character: VocalCharacter | None = None
    rhythmic_complexity: float = Field(default=0.0, ge=0.0, le=1.0)
    production_aesthetic: float = Field(default=0.0, ge=0.0, le=1.0)
    harmonic_darkness: float = Field(default=0.0, ge=0.0, le=1.0)
    instrumentation_profile: InstrumentationProfile = Field(default_factory=InstrumentationProfile)


class UserTasteVector(BaseModel):
    """SOUL's 15-dimensional preference weights.

    A weight of 1.0 is neutral; >1.0 means the user cares more about that
    identifier when matching. Defaults to an all-neutral profile.
    """

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
