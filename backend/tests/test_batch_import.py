"""Tests for batch metadata extraction and demo purge."""

from pathlib import Path

from src.analysis.metadata import extract_tags, scan_audio_files
from src.recommendation.catalog import is_fake_demo_track, purge_demo_tracks


def test_is_fake_demo_track():
    assert is_fake_demo_track({"track_id": "demo_rust_garden", "artist": "Minor Transit"})
    assert not is_fake_demo_track({"track_id": "demo_ceremony", "artist": "New Order"})


def test_purge_demo_tracks(monkeypatch, tmp_path):
    fake = {
        "track_id": "demo_static_veil",
        "title": "Static Veil",
        "artist": "Hollow Frequency",
        "identifiers": {},
    }
    real = {
        "track_id": "demo_ceremony",
        "title": "Ceremony",
        "artist": "New Order",
        "identifiers": {},
    }
    cat = tmp_path / "tracks.json"
    import json

    cat.write_text(json.dumps([fake, real]))
    monkeypatch.setattr("src.recommendation.catalog._catalog_path", lambda: cat)
    removed = purge_demo_tracks()
    assert removed == 1
    remaining = json.loads(cat.read_text())
    assert len(remaining) == 1
    assert remaining[0]["artist"] == "New Order"


def test_extract_tags_from_filename(tmp_path):
    path = tmp_path / "New Order - Ceremony.mp3"
    path.write_bytes(b"")
    artist, title = extract_tags(path)
    assert artist == "New Order"
    assert title == "Ceremony"


def test_scan_audio_files(tmp_path):
    (tmp_path / "a.mp3").write_bytes(b"")
    (tmp_path / "b.flac").write_bytes(b"")
    (tmp_path / "skip.txt").write_bytes(b"")
    sub = tmp_path / "sub"
    sub.mkdir()
    (sub / "c.wav").write_bytes(b"")
    files = scan_audio_files(tmp_path, recursive=True)
    assert len(files) == 3
