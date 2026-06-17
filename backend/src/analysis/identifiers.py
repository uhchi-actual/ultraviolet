"""Master DJ analysis pipeline: Demucs separation → per-stem librosa features.

``analyze_track`` loads a file, runs Demucs (with stem caching), and computes
only identifiers we can back with real data. Heavy deps are imported lazily.
"""

from __future__ import annotations

import asyncio

from src.models.identifiers import IdentifierVector

IDENTIFIER_NAMES: list[str] = [
    "tempo",
    "key_mode",
    "energy",
    "danceability",
    "instrumentalness",
    "loudness_profile",
    "texture_density",
    "rhythmic_complexity",
    "harmonic_darkness",
    "stem_profile",
    "emotional_arc",
]


def analyze_stems(stems) -> IdentifierVector:
    """Compute the fingerprint from pre-separated Demucs stems."""
    from src.analysis.audio_features import (
        extract_danceability,
        extract_energy,
        extract_harmonic_darkness,
        extract_key_mode,
        extract_loudness_profile,
        extract_rhythmic_complexity,
        extract_tempo,
        extract_texture_density,
        harmonic_chroma_mean,
    )
    from src.analysis.demucs_separate import SeparatedStems
    from src.analysis.emotional_arc import extract_emotional_arc
    from src.analysis.stem_energy import (
        build_stem_profile,
        instrumentalness_from_vocals_pct,
        stem_energy_percentages,
    )

    assert isinstance(stems, SeparatedStems)
    y, sr = stems.mix, stems.sr
    harmonic = stems.bass + stems.other
    chroma = harmonic_chroma_mean(harmonic, sr)

    stem_dict: dict[str, object] = {
        "drums": stems.drums,
        "bass": stems.bass,
        "other": stems.other,
        "vocals": stems.vocals,
    }
    if stems.guitar is not None:
        stem_dict["guitar"] = stems.guitar
    if stems.piano is not None:
        stem_dict["piano"] = stems.piano

    pct = stem_energy_percentages(stem_dict)  # type: ignore[arg-type]
    stem_profile = build_stem_profile(pct)
    instrumentalness = instrumentalness_from_vocals_pct(pct.get("vocals", 0.0))

    key, mode = extract_key_mode(harmonic, sr, chroma)

    return IdentifierVector(
        tempo=extract_tempo(stems.drums, sr),
        key=key,
        mode=mode,
        energy=extract_energy(y, sr),
        danceability=extract_danceability(stems.drums, sr),
        instrumentalness=instrumentalness,
        loudness_profile=extract_loudness_profile(y, sr),
        texture_density=extract_texture_density(y, sr),
        rhythmic_complexity=extract_rhythmic_complexity(stems.drums, sr),
        harmonic_darkness=extract_harmonic_darkness(harmonic, sr, chroma),
        stem_profile=stem_profile,
        emotional_arc=extract_emotional_arc(y, sr),
    )


def analyze_from_file(file_path: str) -> IdentifierVector:
    """Synchronous: Demucs separation + identifier extraction."""
    from src.analysis.demucs_separate import separate_track

    stems = separate_track(file_path)
    return analyze_stems(stems)


async def analyze_track(file_path: str) -> IdentifierVector:
    """Load a track, separate with Demucs, and fingerprint off the event loop."""
    return await asyncio.to_thread(analyze_from_file, file_path)
