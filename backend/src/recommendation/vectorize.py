"""Flatten IdentifierVector into a fixed-length feature vector for similarity search."""

from __future__ import annotations

import math

from src.models.identifiers import IdentifierVector

# Circle-of-fifths order mapped to semitones (for key encoding in cosine space)
_FIFTHS_POSITION = (0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5)

FEATURE_KEYS: list[str] = [
    "tempo",
    "key",
    "mode",
    "energy",
    "danceability",
    "instrumentalness",
    "valence",
    "acousticness",
    "loudness_rms",
    "texture_density",
    "rhythmic_complexity",
    "harmonic_darkness",
    "vocals_stem",
]

FEATURE_WEIGHT_KEYS: list[str] = [
    "tempo_weight",
    "key_mode_weight",
    "key_mode_weight",
    "energy_weight",
    "danceability_weight",
    "instrumentalness_weight",
    "valence_weight",
    "acousticness_weight",
    "loudness_weight",
    "texture_density_weight",
    "rhythmic_complexity_weight",
    "harmonic_darkness_weight",
    "instrumentalness_weight",
]

IDENTIFIER_LABELS: dict[str, str] = {
    "tempo": "tempo",
    "key": "key",
    "mode": "tonality",
    "energy": "energy",
    "danceability": "groove",
    "instrumentalness": "instrumental feel",
    "valence": "brightness",
    "acousticness": "acoustic texture",
    "loudness_rms": "loudness",
    "texture_density": "texture",
    "rhythmic_complexity": "rhythm",
    "harmonic_darkness": "mood",
    "vocals_stem": "vocals",
}


def _norm_loudness(rms_db: float) -> float:
    return max(0.0, min(1.0, (rms_db + 60.0) / 60.0))


def to_feature_vector(identifiers: IdentifierVector | dict) -> list[float]:
    if isinstance(identifiers, dict):
        identifiers = IdentifierVector.model_validate(identifiers)
    lp = identifiers.loudness_profile
    key_pos = _FIFTHS_POSITION[identifiers.key % 12] / 6.0
    tempo_log = math.log2(max(identifiers.tempo, 1.0)) / math.log2(200.0)
    return [
        min(tempo_log, 1.0),
        key_pos,
        float(identifiers.mode),
        identifiers.energy,
        identifiers.danceability,
        identifiers.instrumentalness,
        identifiers.valence,
        identifiers.acousticness,
        _norm_loudness(lp.rms_db),
        identifiers.texture_density,
        identifiers.rhythmic_complexity,
        identifiers.harmonic_darkness,
        identifiers.stem_presence.vocals_pct / 100.0,
    ]


def user_weights_from_taste(taste_vector: dict[str, float] | None) -> list[float]:
    if not taste_vector:
        return [1.0] * len(FEATURE_KEYS)
    return [float(taste_vector.get(key, 1.0)) for key in FEATURE_WEIGHT_KEYS]


def top_matching_features(
    seed: list[float],
    candidate: list[float],
    weights: list[float],
    *,
    limit: int = 3,
) -> list[tuple[str, float]]:
    scores: list[tuple[str, float]] = []
    for i, key in enumerate(FEATURE_KEYS):
        delta = 1.0 - abs(seed[i] - candidate[i])
        scores.append((key, delta * weights[i]))
    scores.sort(key=lambda item: item[1], reverse=True)
    return scores[:limit]
