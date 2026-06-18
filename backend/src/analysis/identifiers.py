"""Master DJ pipeline: Demucs separation → per-stem librosa → identifiers + spectral embedding."""

from __future__ import annotations

import asyncio
import uuid

from src.models.identifiers import IdentifierVector

IDENTIFIER_NAMES: list[str] = [
    "tempo",
    "key_mode",
    "energy",
    "danceability",
    "instrumentalness",
    "valence",
    "acousticness",
    "loudness_profile",
    "texture_density",
    "rhythmic_complexity",
    "harmonic_darkness",
    "stem_presence",
    "emotional_arc",
    "spectral_embedding",
]


def analyze_stems(stems) -> IdentifierVector:
    from src.analysis.audio_features import (
        extract_acousticness,
        extract_danceability,
        extract_energy,
        extract_harmonic_darkness,
        extract_key_mode,
        extract_loudness_profile,
        extract_rhythmic_complexity,
        extract_tempo,
        extract_texture_density,
        extract_valence,
        harmonic_chroma_mean,
    )
    from src.analysis.demucs_separator import SeparatedStems
    from src.analysis.emotional_arc import extract_emotional_arc
    from src.analysis.spectral_embedding import extract_spectral_embedding
    from src.analysis.stem_energy import (
        build_stem_presence,
        instrumentalness_from_vocals_pct,
        stem_energy_percentages,
    )

    if not isinstance(stems, SeparatedStems):
        raise TypeError("expected SeparatedStems")

    y = stems.mix
    if y is None or len(y) == 0:
        y = stems.drums + stems.bass + stems.other + stems.vocals
    sr = stems.sr

    harmonic = stems.bass + stems.other
    chroma = harmonic_chroma_mean(harmonic, sr)

    stem_dict = {
        "drums": stems.drums,
        "bass": stems.bass,
        "other": stems.other,
        "vocals": stems.vocals,
    }
    pct = stem_energy_percentages(stem_dict)
    stem_presence = build_stem_presence(pct)
    instrumentalness = instrumentalness_from_vocals_pct(pct["vocals"])

    key, mode = extract_key_mode(harmonic, sr, chroma)

    return IdentifierVector(
        tempo=extract_tempo(stems.drums, sr),
        key=key,
        mode=mode,
        energy=extract_energy(y, sr),
        danceability=extract_danceability(stems.drums, sr),
        instrumentalness=instrumentalness,
        valence=extract_valence(y, sr, chroma),
        acousticness=extract_acousticness(y, sr),
        loudness_profile=extract_loudness_profile(y, sr),
        texture_density=extract_texture_density(y, sr),
        rhythmic_complexity=extract_rhythmic_complexity(stems.drums, sr),
        harmonic_darkness=extract_harmonic_darkness(harmonic, sr, chroma),
        stem_presence=stem_presence,
        emotional_arc=extract_emotional_arc(y, sr),
        spectral_embedding=extract_spectral_embedding(harmonic, sr),
    )


def analyze_from_file(file_path: str, track_id: str | None = None) -> IdentifierVector:
    from src.analysis.demucs_separator import separate_track

    tid = track_id or f"track_{uuid.uuid4().hex[:12]}"
    stems = separate_track(file_path, tid)
    return analyze_stems(stems)


async def analyze_track(file_path: str, track_id: str | None = None) -> IdentifierVector:
    return await asyncio.to_thread(analyze_from_file, file_path, track_id)