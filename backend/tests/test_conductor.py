"""Conductor tests (Phase 1) — fallback behavior when Ollama is unreachable."""

import asyncio

from src.agents.conductor import Conductor


def test_fallback_mentions_model():
    conductor = Conductor(model="test-model:8b")
    text = conductor._fallback("hi there")
    assert "test-model:8b" in text
    assert "hi there" in text


def test_chat_falls_back_when_ollama_down():
    # Point at a closed port so the request fails fast and we hit the fallback.
    conductor = Conductor(model="test-model:8b", host="http://localhost:1")
    reply = asyncio.run(conductor.chat("recommend something", []))
    assert isinstance(reply, str)
    assert reply
