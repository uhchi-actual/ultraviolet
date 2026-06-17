"""UserProfile SQLModel table (PostgreSQL) — SOUL's persisted profile."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

#: The 15 taste-preference dimensions (mirrors the audio identifiers). Each is a
#: 0..1 preference strength: 0 = indifferent/avoids, 1 = strongly drawn to it.
TASTE_KEYS: tuple[str, ...] = (
    "valence_weight",
    "energy_weight",
    "danceability_weight",
    "acousticness_weight",
    "tempo_weight",
    "key_mode_weight",
    "instrumentalness_weight",
    "loudness_weight",
    "texture_density_weight",
    "emotional_arc_weight",
    "vocal_character_weight",
    "rhythmic_complexity_weight",
    "production_aesthetic_weight",
    "harmonic_darkness_weight",
    "instrumentation_weight",
)


def neutral_taste() -> dict[str, float]:
    """A neutral taste vector (all 0.5) used before/without LLM synthesis."""
    return {key: 0.5 for key in TASTE_KEYS}


def coerce_taste(raw: object) -> dict[str, float]:
    """Validate an arbitrary taste dict: keep known keys, clamp to [0, 1]."""
    out = neutral_taste()
    if isinstance(raw, dict):
        for key in TASTE_KEYS:
            value = raw.get(key)
            if isinstance(value, (int, float)):
                out[key] = round(min(max(float(value), 0.0), 1.0), 3)
    return out


class UserProfile(SQLModel, table=True):
    id: str = Field(primary_key=True)
    taste_vector: dict = Field(default_factory=dict, sa_column=Column(JSON))
    top_genres: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    top_artists: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    listening_heatmap: list[list[float]] = Field(default_factory=list, sa_column=Column(JSON))
    total_tracks: int = 0
    total_listening_hours: float = 0.0
    last_profile_update: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
