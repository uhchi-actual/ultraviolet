"""UserProfile SQLModel table (PostgreSQL) — SOUL's persisted profile."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class UserProfile(SQLModel, table=True):
    id: str = Field(primary_key=True)
    taste_vector: dict = Field(default_factory=dict, sa_column=Column(JSON))
    top_genres: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    listening_heatmap: list[list[float]] = Field(default_factory=list, sa_column=Column(JSON))
    total_tracks: int = 0
    total_listening_hours: float = 0.0
    last_profile_update: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
