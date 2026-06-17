"""Master analysis pipeline: run all 15 identifier extractors for a track.

``analyze_waveform`` is the synchronous core; ``analyze_track`` loads a file and
runs it off the event loop. Heavy audio deps are imported lazily here so the app
can be imported without the audio stack installed.
"""

from __future__ import annotations

import asyncio

from src.models.identifiers import IdentifierVector

IDENTIFIER_NAMES: list[str] = [
    "valence",
    "energy",
    "danceability",
    "acousticness",
    "tempo",
    "key_mode",
    "instrumentalness",
    "loudness_profile",
    "texture_density",
    "emotional_arc",
    "vocal_character",
    "rhythmic_complexity",
    "production_aesthetic",
    "harmonic_darkness",
    "instrumentation_profile",
]


def analyze_waveform(y, sr: int) -> IdentifierVector:
    """Compute the full 15-identifier fingerprint from a loaded waveform."""
    from src.analysis.audio_features import (
        extract_acousticness,
        extract_danceability,
        extract_energy,
        extract_harmonic_darkness,
        extract_instrumentalness,
        extract_key_mode,
        extract_loudness_profile,
        extract_production_aesthetic,
        extract_rhythmic_complexity,
        extract_tempo,
        extract_texture_density,
        extract_valence,
        harmonic_chroma_mean,
    )
    from src.analysis.emotional_arc import extract_emotional_arc
    from src.analysis.instruments import extract_instrumentation_profile
    from src.analysis.vocal_analysis import extract_vocal_character

    # Compute the harmonic chroma once and share it across the tonal extractors.
    chroma_mean = harmonic_chroma_mean(y, sr)
    key, mode = extract_key_mode(y, sr, chroma_mean)
    instrumentalness = extract_instrumentalness(y, sr)

    instrumentation = extract_instrumentation_profile(y, sr)
    instrumentation.vocals = round(float(min(max(1.0 - instrumentalness, 0.0), 1.0)), 3)

    return IdentifierVector(
        valence=extract_valence(y, sr, chroma_mean),
        energy=extract_energy(y, sr),
        danceability=extract_danceability(y, sr),
        acousticness=extract_acousticness(y, sr),
        tempo=extract_tempo(y, sr),
        key=key,
        mode=mode,
        instrumentalness=instrumentalness,
        loudness_profile=extract_loudness_profile(y, sr),
        texture_density=extract_texture_density(y, sr),
        emotional_arc=extract_emotional_arc(y, sr),
        vocal_character=extract_vocal_character(y, sr, instrumentalness),
        rhythmic_complexity=extract_rhythmic_complexity(y, sr),
        production_aesthetic=extract_production_aesthetic(y, sr),
        harmonic_darkness=extract_harmonic_darkness(y, sr, chroma_mean),
        instrumentation_profile=instrumentation,
    )


async def analyze_track(file_path: str) -> IdentifierVector:
    """Load a track and compute its full 15-identifier fingerprint off-thread."""
    from src.utils.audio_io import load_audio

    def _run() -> IdentifierVector:
        y, sr = load_audio(file_path)
        return analyze_waveform(y, sr)

    return await asyncio.to_thread(_run)
