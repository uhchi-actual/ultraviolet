"""GET /api/health — health check for all services."""

from __future__ import annotations

import socket

import httpx
from fastapi import APIRouter

from src.config import settings

router = APIRouter()


def _tcp_open(host: str, port: int, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


async def _ollama_status() -> tuple[str, str]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.ollama_host}/api/tags")
        if resp.status_code == 200:
            names = [m.get("name", "") for m in resp.json().get("models", [])]
            base = settings.ollama_model.split(":")[0]
            loaded = any(base in name for name in names)
            return "up", (f"{settings.ollama_model} loaded" if loaded else "model not pulled")
    except (httpx.HTTPError, ValueError):
        pass
    return "down", "unavailable"


@router.get("/health")
async def health() -> dict[str, object]:
    ollama_state, ollama_model = await _ollama_status()

    # Parse host:port for ChromaDB / Postgres TCP probes.
    db_host = "localhost"
    db_port = 5432
    try:
        tail = settings.database_url.split("@", 1)[1]
        hostport = tail.split("/", 1)[0]
        db_host = hostport.split(":")[0]
        db_port = int(hostport.split(":")[1]) if ":" in hostport else 5432
    except (IndexError, ValueError):
        pass

    services = {
        "fastapi": "up",
        "postgresql": "up" if _tcp_open(db_host, db_port) else "down",
        "chromadb": "up" if _tcp_open(settings.chromadb_host, settings.chromadb_port) else "down",
        "ollama": ollama_state,
        "ollama_model": ollama_model,
    }
    healthy = services["fastapi"] == "up"
    return {
        "status": "healthy" if healthy else "degraded",
        "build": "clap-text-seeds-v2",
        "services": services,
    }
