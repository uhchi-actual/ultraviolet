"""DJ — the music analyzer agent.

Extracts the 15-identifier audio fingerprint from any track. This is a pure
signal-processing + ML pipeline (no LLM). Implemented in Phase 2; the heavy
audio dependencies (librosa, essentia) are imported lazily inside the analysis
modules so importing this agent never requires them.
"""

from __future__ import annotations

from src.models.identifiers import IdentifierVector


class DJ:
    """Audio analysis pipeline producing a 15-identifier vector per track."""

    async def analyze(self, file_path: str) -> IdentifierVector:
        # Defer to the analysis pipeline (Phase 2). Imported lazily on purpose.
        from src.analysis.identifiers import analyze_track

        return await analyze_track(file_path)
