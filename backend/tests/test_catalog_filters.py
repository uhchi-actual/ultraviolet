"""Tests for catalog filtering."""

from src.recommendation.catalog_filters import is_named_track, track_dedupe_key


def test_unnamed_listen_capture_excluded():
    assert not is_named_track({"title": "Identified track", "artist": "Unknown Artist"})
    assert not is_named_track({"title": "listen-123", "artist": ""})


def test_named_track_ok():
    assert is_named_track({"title": "Darkness", "artist": "Chris Stussy"})


def test_dedupe_key():
    assert track_dedupe_key({"title": "Ceremony", "artist": "New Order"}) == "new order|ceremony"
