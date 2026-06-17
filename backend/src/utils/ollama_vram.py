"""Free GPU VRAM by unloading Ollama models before Demucs runs."""

from __future__ import annotations

import logging

import httpx

from src.config import settings

logger = logging.getLogger("ultraviolet.ollama_vram")


def unload_ollama_models() -> None:
    """Unload all loaded Ollama models (keep_alive=0) so Demucs can use the GPU."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(f"{settings.ollama_host}/api/ps")
            resp.raise_for_status()
            models = resp.json().get("models", [])
            for entry in models:
                name = entry.get("name") or entry.get("model")
                if not name:
                    continue
                client.post(
                    f"{settings.ollama_host}/api/generate",
                    json={"model": name, "prompt": "", "keep_alive": 0},
                )
                logger.info("Unloaded Ollama model: %s", name)
            if not models:
                client.post(
                    f"{settings.ollama_host}/api/generate",
                    json={"model": settings.ollama_model, "prompt": "", "keep_alive": 0},
                )
    except httpx.HTTPError as exc:
        logger.warning("Could not unload Ollama models (%s); Demucs may OOM on GPU.", exc)
