"""FMA catalog — metadata, search, CLAP embeddings, recommendation pool."""

from __future__ import annotations

import ast
import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from src.config import settings

logger = logging.getLogger("ultraviolet.fma")

FMA_SMALL_MAX_ID = 7999  # legacy name; fma_small.zip uses scattered ids across full FMA


def _fma_root() -> Path:
    return Path(settings.fma_dir)


def _metadata_dir() -> Path:
    root = _fma_root()
    nested = root / "fma_metadata"
    return nested if nested.exists() else root


def _catalog_path() -> Path:
    return Path(settings.catalog_dir) / "fma_index.json"


def _embeddings_path() -> Path:
    return Path(settings.catalog_dir) / "fma_clap.npz"


def _audio_path(track_id: int) -> Path:
    folder = f"{track_id // 1000:03d}"
    return _fma_root() / "fma_small" / folder / f"{track_id:06d}.mp3"


def _parse_genres(raw: Any) -> list[int]:
    if raw is None or (isinstance(raw, float) and np.isnan(raw)):
        return []
    if isinstance(raw, list):
        return [int(g) for g in raw]
    if isinstance(raw, str):
        try:
            parsed = ast.literal_eval(raw)
            return [int(g) for g in parsed]
        except (ValueError, SyntaxError):
            return []
    return []


def _echonest_features(track_id: int, echonest: Any | None) -> dict[str, Any]:
    if echonest is None or track_id not in echonest.index:
        return {}
    row = echonest.loc[track_id]
    try:
        tempo = float(row[("audio_features", "tempo")])
        energy = float(row[("audio_features", "energy")])
        dance = float(row[("audio_features", "danceability")])
        instr = float(row[("audio_features", "instrumentalness")])
        valence = float(row[("audio_features", "valence")])
        acoustic = float(row[("audio_features", "acousticness")])
    except (KeyError, TypeError, ValueError):
        return {}
    return {
        "tempo": tempo,
        "key": int(track_id % 12),
        "mode": 1,
        "energy": min(1.0, max(0.0, energy)),
        "danceability": min(1.0, max(0.0, dance)),
        "instrumentalness": min(1.0, max(0.0, instr)),
        "valence": min(1.0, max(0.0, valence)),
        "acousticness": min(1.0, max(0.0, acoustic)),
        "loudness_profile": {"peak_db": -3.0, "rms_db": -12.0, "dynamic_range": 6.0, "crest_factor": 2.0},
        "texture_density": 0.5,
        "rhythmic_complexity": 0.4,
        "harmonic_darkness": 0.5,
        "stem_presence": {"drums_pct": 25, "bass_pct": 25, "other_pct": 25, "vocals_pct": 25},
        "emotional_arc": {"values": [], "label": ""},
        "spectral_embedding": [0.0] * 25,
    }


def build_fma_index_from_metadata() -> list[dict[str, Any]]:
    """Build FMA small catalog: every on-disk mp3, merged with tracks.csv when available."""
    import pandas as pd

    tracks_path = _metadata_dir() / "tracks.csv"
    meta_by_id: dict[int, Any] = {}
    if tracks_path.exists():
        tracks = pd.read_csv(tracks_path, index_col=0, header=[0, 1])
        for tid, row in tracks.iterrows():
            meta_by_id[int(tid)] = row

    echonest_path = _metadata_dir() / "echonest.csv"
    echonest = None
    if echonest_path.exists():
        echonest = pd.read_csv(echonest_path, index_col=0, header=[0, 1], low_memory=False)

    audio_root = _fma_root() / "fma_small"
    if not audio_root.exists():
        raise FileNotFoundError(f"FMA audio not found under {audio_root}")

    records: list[dict[str, Any]] = []
    for mp3 in sorted(audio_root.rglob("*.mp3")):
        track_id = int(mp3.stem)
        row = meta_by_id.get(track_id)
        if row is not None:
            genres = _parse_genres(row[("track", "genres")])
            genre_top = str(row[("track", "genre_top")] or "")
            title = str(row[("track", "title")] or "")
            artist = str(row[("artist", "name")] or "")
        else:
            genres = []
            genre_top = ""
            title = f"Track {track_id}"
            artist = "Unknown"
        identifiers = _echonest_features(track_id, echonest)
        records.append(
            {
                "track_id": f"fma_{track_id}",
                "fma_id": track_id,
                "title": title,
                "artist": artist,
                "genres": genres,
                "genre_top": genre_top,
                "genre_bucket": genre_top or "unknown",
                "source": "fma",
                "audio_path": str(mp3),
                "identifiers": identifiers,
            }
        )
    return records


def save_fma_index(tracks: list[dict[str, Any]]) -> None:
    path = _catalog_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    slim = [{k: v for k, v in t.items() if k != "clap_embedding"} for t in tracks]
    path.write_text(json.dumps(slim), encoding="utf-8")
    logger.info("Saved FMA index: %d tracks -> %s", len(slim), path)


def save_clap_embeddings(track_ids: list[str], embeddings: np.ndarray) -> None:
    path = _embeddings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(path, track_ids=np.array(track_ids), embeddings=embeddings.astype(np.float32))
    logger.info("Saved CLAP embeddings: %s", path)


@lru_cache(maxsize=1)
def _load_clap_npz() -> dict[str, np.ndarray]:
    path = _embeddings_path()
    if path.exists() and path.stat().st_size > 10_000:
        data = np.load(path, allow_pickle=True)
        ids = [str(x) for x in data["track_ids"].tolist()]
        emb = data["embeddings"]
        return dict(zip(ids, emb, strict=True))

    checkpoint = Path(settings.catalog_dir) / "fma_embed_checkpoint.json"
    if checkpoint.exists() and checkpoint.stat().st_size > 10:
        try:
            raw = json.loads(checkpoint.read_text(encoding="utf-8"))
            return {k: np.asarray(v, dtype=np.float32) for k, v in raw.items() if isinstance(v, list)}
        except (json.JSONDecodeError, OSError, ValueError):
            pass
    return {}


def list_fma_tracks(*, with_embeddings_only: bool = False) -> list[dict[str, Any]]:
    path = _catalog_path()
    if not path.exists():
        logger.warning("FMA index missing — run scripts/build_fma_catalog.py")
        return []
    tracks = json.loads(path.read_text(encoding="utf-8"))
    emb_map = _load_clap_npz()
    out: list[dict[str, Any]] = []
    for t in tracks:
        tid = t.get("track_id", "")
        emb = emb_map.get(tid)
        if with_embeddings_only and emb is None:
            continue
        if emb is not None:
            t = {**t, "clap_embedding": emb.tolist()}
        out.append(t)
    return out


def get_fma_track(track_id: str) -> dict[str, Any] | None:
    for t in list_fma_tracks():
        if t.get("track_id") == track_id:
            return t
    return None


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def search_fma(query: str, *, limit: int = 20) -> list[dict[str, Any]]:
    """Fuzzy search FMA catalog by artist + title."""
    q = query.strip()
    if not q:
        return []

    title, artist = q, ""
    for sep in (" - ", " – ", " — "):
        if sep in q:
            artist, title = [p.strip() for p in q.split(sep, 1)]
            break
    if not title:
        title = q

    scored: list[tuple[float, dict[str, Any]]] = []
    for track in list_fma_tracks():
        score = 0.0
        t = _norm(track.get("title", ""))
        a = _norm(track.get("artist", ""))
        ti = _norm(title)
        ai = _norm(artist)
        if ti and ti == t:
            score += 5.0
        elif ti and ti in t:
            score += 3.0
        if ai and ai == a:
            score += 5.0
        elif ai and ai in a:
            score += 3.0
        if score > 0:
            scored.append((score, track))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [t for _, t in scored[:limit]]


def recommendation_pool() -> list[dict[str, Any]]:
    """Primary discovery pool: FMA tracks with CLAP embeddings when available."""
    fma = list_fma_tracks(with_embeddings_only=True)
    if fma:
        return fma
    return list_fma_tracks()
