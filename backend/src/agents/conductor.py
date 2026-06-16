"""Conductor — the orchestrator agent.

Phase 1 implements conversational chat backed by a local Ollama model, with a
graceful fallback when Ollama is unreachable. Later phases add the LangGraph
state machine (see ``graph.py``), recommendation routing, and Tree provenance.
"""

from __future__ import annotations

import logging

import httpx

from src.config import settings

logger = logging.getLogger("ultraviolet.conductor")

SYSTEM_PROMPT = (
    "You are the Conductor, the orchestrator of Ultraviolet — a local, content-based "
    "music recommendation engine that surfaces niche artists and explains every "
    "recommendation. Be concise, knowledgeable about music, and warm. When you do not "
    "yet have the user's library or audio analysis available, say so honestly."
)


class Conductor:
    """Routes queries and (for now) handles conversational chat via Ollama."""

    def __init__(self, model: str | None = None, host: str | None = None) -> None:
        self.model = model or settings.ollama_model
        self.host = host or settings.ollama_host

    async def chat(self, message: str, history: list[dict] | None = None) -> str:
        messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        if history:
            messages.extend(
                {"role": turn.get("role", "user"), "content": turn.get("content", "")}
                for turn in history
            )
        messages.append({"role": "user", "content": message})

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.host}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {"temperature": 0.7},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
            content = data.get("message", {}).get("content", "").strip()
            return content or self._fallback(message)
        except httpx.HTTPError as exc:
            logger.warning("Ollama unreachable (%s); using fallback response.", exc)
            return self._fallback(message)

    def _fallback(self, message: str) -> str:
        return (
            "The Conductor is online, but the local LLM (Ollama) isn't reachable yet. "
            "Start it and pull the model:\n\n"
            f"    ollama pull {self.model}\n\n"
            f'Once it\'s running I\'ll respond properly. You said: "{message}"'
        )
