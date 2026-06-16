"""ChromaDB client and collection helpers (vector store).

``chromadb`` lives in the ``agents`` extra and is imported lazily so the API
boots without it installed.
"""

from __future__ import annotations

from functools import lru_cache

from src.config import settings

TRACK_EMBEDDINGS = "track_embeddings"
SOUL_PERSONAL_DATA = "soul_personal_data"


@lru_cache(maxsize=1)
def get_client():
    import chromadb

    return chromadb.HttpClient(host=settings.chromadb_host, port=settings.chromadb_port)


def get_collection(name: str):
    return get_client().get_or_create_collection(name=name)
