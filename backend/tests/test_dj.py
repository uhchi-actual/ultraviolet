"""DJ agent tests (Phase 1) — analysis pipeline is a Phase 2 stub."""

import asyncio

import pytest

from src.agents.dj import DJ


def test_analyze_not_implemented_yet():
    with pytest.raises(NotImplementedError):
        asyncio.run(DJ().analyze("nonexistent.mp3"))
