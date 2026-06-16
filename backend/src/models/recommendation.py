"""Recommendation, TreeEdge, and ListeningHistory SQLModel tables (PostgreSQL)."""

from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class Recommendation(SQLModel, table=True):
    id: str = Field(primary_key=True)  # UUID
    seed_track_id: str = Field(foreign_key="track.id")
    recommended_track_id: str = Field(foreign_key="track.id")
    confidence: float
    obscurity_dial_setting: float
    recommendation_type: str  # direct | bridge | discovery_quota
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TreeEdge(SQLModel, table=True):
    id: str = Field(primary_key=True)
    recommendation_id: str = Field(foreign_key="recommendation.id")
    source_track_id: str = Field(foreign_key="track.id")
    target_track_id: str = Field(foreign_key="track.id")
    identifier: str
    weight: float
    match_type: str  # heavy_rotation | play_count_top_15pct | aggregate_preference | bridge_hop
    explanation: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ListeningHistory(SQLModel, table=True):
    id: str = Field(primary_key=True)
    track_id: str = Field(foreign_key="track.id")
    played_at: datetime
    duration_played_ms: int = 0
    skipped: bool = False
    source: str = "spotify_import"  # spotify_import | manual
