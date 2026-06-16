"""PostgreSQL connection and session management (SQLModel).

The engine and driver imports are lazy so the API boots without a live database
or the psycopg driver present (e.g. for lint/test runs).
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from src.config import settings

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    from sqlmodel import create_engine

    return create_engine(settings.sqlalchemy_url, echo=False, pool_pre_ping=True)


def init_db() -> None:
    """Create tables for all registered models."""
    from sqlmodel import SQLModel

    # Import table modules so their metadata is registered before create_all.
    from src.models import recommendation, track, user  # noqa: F401

    SQLModel.metadata.create_all(get_engine())


def get_session():
    """FastAPI dependency that yields a database session."""
    from sqlmodel import Session

    with Session(get_engine()) as session:
        yield session
