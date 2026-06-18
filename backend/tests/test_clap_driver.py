"""CLAP driver integration test — requires two FMA audio files."""

from __future__ import annotations

import pytest

from src.catalog.fma import list_fma_tracks
from src.scoring.clap_driver import clap_similarity, embed_audio_file


def _first_two_audio_paths() -> list[str]:
    paths: list[str] = []
    for track in list_fma_tracks():
        p = track.get("audio_path") or ""
        if p and __import__("pathlib").Path(p).exists():
            paths.append(p)
        if len(paths) >= 2:
            break
    return paths


@pytest.mark.skipif(len(_first_two_audio_paths()) < 2, reason="FMA audio not downloaded")
def test_clap_similar_tracks_same_genre():
    """Two tracks from catalog with audio should embed and compare."""
    tracks_with_audio = [t for t in list_fma_tracks() if t.get("audio_path")]
    # Pick two tracks sharing a genre if possible
    by_genre: dict[int, list] = {}
    for t in tracks_with_audio:
        for g in t.get("genres") or []:
            by_genre.setdefault(g, []).append(t)
    pair = None
    for candidates in by_genre.values():
        if len(candidates) >= 2:
            a, b = candidates[0], candidates[1]
            if __import__("pathlib").Path(a["audio_path"]).exists() and __import__(
                "pathlib"
            ).Path(b["audio_path"]).exists():
                pair = (a["audio_path"], b["audio_path"])
                break
    if pair is None:
        paths = _first_two_audio_paths()
        pair = (paths[0], paths[1])

    emb_a = embed_audio_file(pair[0])
    emb_b = embed_audio_file(pair[1])
    sim = clap_similarity(emb_a, emb_b)
    assert sim > 0.3  # same-genre pairs often > 0.7; cross-genre may be lower
