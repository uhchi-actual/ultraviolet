"""Embedding generation for ChromaDB via Ollama.

Used by SOUL's RAG pipeline (Phase 3) and the DJ's track-embedding storage
(Phase 2). Uses httpx against the Ollama embeddings API.
"""

from __future__ import annotations

import httpx

from src.config import settings


async def embed_text(text: str) -> list[float]:
    """Generate an embedding for a chunk of text via Ollama."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.ollama_host}/api/embeddings",
            json={"model": settings.embedding_model, "prompt": text},
        )
        resp.raise_for_status()
        return resp.json()["embedding"]
