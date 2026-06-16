"""Identifier schema tests (Phase 1)."""

from src.analysis.identifiers import IDENTIFIER_NAMES
from src.models.identifiers import IdentifierVector, InstrumentationProfile


def test_identifier_names_count():
    assert len(IDENTIFIER_NAMES) == 15


def test_identifier_vector_defaults():
    vec = IdentifierVector()
    assert len(vec.emotional_arc) == 4
    assert isinstance(vec.instrumentation_profile, InstrumentationProfile)
    assert vec.vocal_character is None


def test_instrumentation_profile_has_12_categories():
    assert len(InstrumentationProfile.model_fields) == 12
