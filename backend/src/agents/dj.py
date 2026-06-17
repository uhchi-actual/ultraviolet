"""DJ — the music analyzer agent.

Extracts an accurate audio fingerprint via Demucs stem separation + per-stem
librosa features. No LLM. Heavy deps (demucs, torch, librosa) load lazily.
"""

from __future__ import annotations

from src.models.identifiers import IdentifierVector


class DJ:
    """Demucs-backed analysis pipeline."""

    async def analyze(self, file_path: str) -> IdentifierVector:
        from src.analysis.identifiers import analyze_track

        return await analyze_track(file_path)
