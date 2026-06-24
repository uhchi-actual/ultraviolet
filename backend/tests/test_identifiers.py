"""Identifier schema and stem-energy unit tests (PRD addendum)."""

from __future__ import annotations

import numpy as np

from src.analysis.demucs_separator import SeparatedStems
from src.analysis.emotional_arc import extract_emotional_arc
from src.analysis.identifiers import IDENTIFIER_NAMES, analyze_stems
from src.analysis.stem_energy import (
    build_stem_presence,
    instrumentalness_from_vocals_pct,
    stem_energy_percentages,
)
from src.models.identifiers import EmotionalArc, IdentifierVector, StemPresence


def test_identifier_names_count():
    assert len(IDENTIFIER_NAMES) == 14


def test_stem_presence_has_four_fields():
    assert len(StemPresence.model_fields) == 4


def test_instrumentalness_threshold():
    assert instrumentalness_from_vocals_pct(0.0) == 1.0
    assert instrumentalness_from_vocals_pct(4.9) == 1.0
    assert instrumentalness_from_vocals_pct(50.0) == 0.5


def _synthetic_stems(vocal_scale: float = 0.001, seconds: float = 8.0) -> SeparatedStems:
    sr = 22050
    n = int(sr * seconds)
    t = np.linspace(0, seconds, n, endpoint=False)
    drums = (0.7 * np.sin(2 * np.pi * 2 * t) * (np.sin(2 * np.pi * 120 * t) > 0)).astype(np.float32)
    bass = (0.5 * np.sin(2 * np.pi * 55 * t)).astype(np.float32)
    other = (0.4 * np.sin(2 * np.pi * 330 * t)).astype(np.float32)
    vocals = (vocal_scale * np.sin(2 * np.pi * 200 * t)).astype(np.float32)
    mix = drums + bass + other + vocals
    mix = (mix / (float(np.max(np.abs(mix))) or 1.0) * 0.9).astype(np.float32)
    return SeparatedStems(sr=sr, mix=mix, drums=drums, bass=bass, other=other, vocals=vocals)


def test_instrumental_track_vocals_near_zero():
    """Don Toliver-style instrumental: vocals stem near 0%, instrumentalness ~1.0."""
    vector = analyze_stems(_synthetic_stems(vocal_scale=0.001))

    assert vector.stem_presence.vocals_pct < 5.0
    assert vector.instrumentalness >= 0.99
    assert vector.stem_presence.drums_pct > 0


def test_vocal_track_lower_instrumentalness():
    vector = analyze_stems(_synthetic_stems(vocal_scale=0.8))

    assert vector.stem_presence.vocals_pct >= 5.0
    assert vector.instrumentalness < 0.95


def test_stem_percentages_sum_to_100():
    stems = {
        "drums": np.ones(1000, dtype=np.float32) * 0.8,
        "bass": np.ones(1000, dtype=np.float32) * 0.4,
        "other": np.ones(1000, dtype=np.float32) * 0.6,
        "vocals": np.ones(1000, dtype=np.float32) * 0.01,
    }
    pct = stem_energy_percentages(stems)
    assert abs(sum(pct.values()) - 100.0) < 0.2
    presence = build_stem_presence(pct)
    assert isinstance(presence, StemPresence)


def test_flat_arc_hidden():
    sr = 22050
    y = np.ones(sr * 4, dtype=np.float32) * 0.5
    arc = extract_emotional_arc(y, sr)
    assert arc.values == []
    assert "Consistent" in arc.label


def test_identifier_vector_defaults():
    vec = IdentifierVector()
    assert isinstance(vec.stem_presence, StemPresence)
    assert isinstance(vec.emotional_arc, EmotionalArc)
