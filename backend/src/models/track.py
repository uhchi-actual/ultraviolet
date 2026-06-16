"""Track SQLModel table (PostgreSQL) — stores metadata + the 15 identifiers."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import ARRAY, JSON, Column, Float, String
from sqlmodel import Field, SQLModel


class Track(SQLModel, table=True):
    id: str = Field(primary_key=True)  # UUID
    title: str
    artist: str
    album: str | None = None
    year: int | None = None
    genre_tags: list[str] | None = Field(default=None, sa_column=Column(ARRAY(String)))
    duration_seconds: float = 0.0
    file_path: str | None = None
    source: str = "user_upload"  # spotify_history | bandcamp | user_upload | soundcloud
    popularity_score: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ── 15 identifiers (individual columns for query flexibility) ──
    valence: float | None = None
    energy: float | None = None
    danceability: float | None = None
    acousticness: float | None = None
    tempo: float | None = None
    key: int | None = None
    mode: int | None = None
    instrumentalness: float | None = None
    loudness_peak_db: float | None = None
    loudness_rms_db: float | None = None
    loudness_dynamic_range: float | None = None
    loudness_crest_factor: float | None = None
    texture_density: float | None = None
    emotional_arc: list[float] | None = Field(default=None, sa_column=Column(ARRAY(Float)))
    vocal_character: dict | None = Field(default=None, sa_column=Column(JSON))
    rhythmic_complexity: float | None = None
    production_aesthetic: float | None = None
    harmonic_darkness: float | None = None
    instrumentation_profile: dict | None = Field(default=None, sa_column=Column(JSON))
