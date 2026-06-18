"""Application configuration via environment variables (Pydantic Settings)."""

from __future__ import annotations

from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ──
    database_url: str = "postgresql://ultraviolet:ultraviolet@localhost:5432/ultraviolet"

    # ── ChromaDB ──
    chromadb_host: str = "localhost"
    chromadb_port: int = 8000

    # ── Ollama ──
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "goekdenizguelmez/JOSIEFIED-Qwen3:8b"
    embedding_model: str = "nomic-embed-text"

    # ── Demucs (DJ stem separation) — cache on D: drive by default ──
    stem_cache_dir: str = "D:/ultraviolet-data/stems"
    catalog_dir: str = "D:/ultraviolet-data/catalog"
    session_dir: str = "D:/ultraviolet-data/sessions"
    demucs_model: str = "htdemucs"  # or htdemucs_ft for higher quality (4× slower)
    demucs_device: str = "cuda"

    # ── NicheSearch (optional streaming — off by default) ──
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    soundcloud_client_id: str = "iZIs9mpkhJqVeWKrX9R1FL2h"
    enable_streaming_identity: bool = False
    enable_streaming_niche: bool = False

    # ── CORS ──
    # NoDecode: stop pydantic-settings from JSON-parsing the env var so the
    # validator below can accept a plain comma-separated string.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def sqlalchemy_url(self) -> str:
        """Normalize the DB URL to use the psycopg (v3) driver for SQLAlchemy."""
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url


settings = Settings()
