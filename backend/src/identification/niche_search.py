"""NicheSearch — local fingerprint first; optional streaming identity (off by default)."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import httpx

from src.config import settings
from src.identification.local_fingerprint import identify_in_catalog
from src.identification.streaming_clients import (
    search_itunes,
    search_soundcloud,
    search_spotify_tracks,
    search_youtube_innertube,
    spotify_token,
)
from src.models.identifiers import IdentifierVector

logger = logging.getLogger("ultraviolet.niche_search")

KEY_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

NICHE_TERMS = ("remix", "bootleg", "edit", "flip", "rework", "vip", "dub", "version", "mashup")

GENERIC_TITLES = frozenset(
    {"", "identified track", "captured audio", "upload", "listen", "unknown"}
)
GENERIC_ARTISTS = frozenset({"", "unknown", "unknown artist"})


def _clean(s: str | None) -> str:
    return (s or "").strip()


def _has_identity(title: str | None, artist: str | None) -> bool:
    t = _clean(title).lower()
    a = _clean(artist).lower()
    if t.startswith("listen-") or t.startswith("track_"):
        return False
    return t not in GENERIC_TITLES and (a not in GENERIC_ARTISTS or len(t) > 3)


def build_identity_queries(title: str | None, artist: str | None) -> list[str]:
    queries: list[str] = []
    t = _clean(title)
    a = _clean(artist)
    if t.startswith("listen-") or t.startswith("track_"):
        return []
    if not _has_identity(t, a) and not t:
        return queries
    if a and t and t.lower() not in GENERIC_TITLES:
        queries.append(f"{a} {t}")
        queries.append(f'"{t}" {a}')
        bare = t.split("(")[0].strip()
        if bare and bare != t:
            queries.append(f"{a} {bare}")
    elif t and t.lower() not in GENERIC_TITLES:
        queries.append(t)
    if a and a.lower() not in GENERIC_ARTISTS:
        queries.append(a)
    seen: set[str] = set()
    out: list[str] = []
    for q in queries:
        qn = " ".join(q.split())
        if qn.lower() not in seen:
            seen.add(qn.lower())
            out.append(qn)
    return out[:4]


def build_niche_queries(
    identifiers: IdentifierVector, *, title: str | None = None, artist: str | None = None
) -> list[str]:
    bpm = int(round(identifiers.tempo))
    key_name = KEY_NAMES[identifiers.key % 12]
    mode = "major" if identifiers.mode == 1 else "minor"
    queries: list[str] = []
    t, a = _clean(title), _clean(artist)
    if _has_identity(t, a):
        queries.append(f"{a} {t} remix")
    queries.append(f"{bpm} bpm {key_name} {mode} remix")
    return queries[:3]


def stem_section_hints(identifiers: IdentifierVector) -> list[str]:
    sp = identifiers.stem_presence
    hints: list[str] = []
    if sp.vocals_pct <= 8:
        hints.append("instrumental")
    if sp.drums_pct >= 32:
        hints.append("club mix")
    return hints[:3]


def _identity_score(
    hit_title: str, hit_artist: str, title: str | None, artist: str | None
) -> float:
    text = f"{hit_title} {hit_artist}".lower()
    score = 0.15
    a = _clean(artist).lower()
    t = _clean(title).lower()
    has_a = a and a not in GENERIC_ARTISTS
    has_t = t and t not in GENERIC_TITLES

    if has_a:
        if a in text:
            score += 0.4
        elif not has_t:
            return 0.08
    if has_t:
        if t in text or text in t:
            score += 0.4
        for word in t.split():
            if len(word) > 3 and word in text:
                score += 0.1
    if not has_a and not has_t:
        score = 0.5
    return min(0.99, score)


def _niche_score(hit_title: str, hit_artist: str, identifiers: IdentifierVector) -> float:
    text = f"{hit_title} {hit_artist}".lower()
    score = 0.15
    bpm = int(round(identifiers.tempo))
    if str(bpm) in text:
        score += 0.12
    for term in NICHE_TERMS:
        if term in text:
            score += 0.05
    return min(0.55, score)


def _to_hit(
    raw: dict[str, str],
    source: str,
    query: str,
    *,
    identity: bool,
    title: str | None,
    artist: str | None,
    identifiers: IdentifierVector,
) -> dict[str, Any]:
    conf = (
        _identity_score(raw["title"], raw.get("artist", ""), title, artist)
        if identity
        else _niche_score(raw["title"], raw.get("artist", ""), identifiers)
    )
    return {
        "title": raw["title"],
        "artist": raw.get("artist", ""),
        "url": raw["url"],
        "source": source,
        "query": query,
        "match_reason": f"{'Match' if identity else 'Niche'} · {query}",
        "confidence": conf,
        "kind": "identity" if identity else "niche",
    }


async def _search_source(
    client: httpx.AsyncClient,
    source: str,
    queries: list[str],
    *,
    identity: bool,
    title: str | None,
    artist: str | None,
    identifiers: IdentifierVector,
) -> dict[str, Any]:
    if not queries:
        return {"source": source, "status": "empty", "hits": []}

    if source == "spotify" and not await spotify_token(client):
        return {
            "source": source,
            "status": "skipped",
            "message": "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.",
            "hits": [],
        }

    fns = {
        "spotify": search_spotify_tracks,
        "youtube": search_youtube_innertube,
        "soundcloud": search_soundcloud,
        "itunes": search_itunes,
    }
    fn = fns.get(source)
    if not fn:
        return {"source": source, "status": "skipped", "hits": []}

    hits: list[dict[str, Any]] = []
    for query in queries:
        try:
            for raw in await fn(client, query, limit=5):
                hits.append(
                    _to_hit(
                        raw,
                        source,
                        query,
                        identity=identity,
                        title=title,
                        artist=artist,
                        identifiers=identifiers,
                    )
                )
            if identity and hits:
                break
        except Exception as exc:
            logger.warning("%s search failed: %s", source, exc)

    hits.sort(key=lambda h: h["confidence"], reverse=True)
    seen: set[str] = set()
    unique = []
    for h in hits:
        if h["url"] in seen:
            continue
        seen.add(h["url"])
        unique.append(h)

    return {"source": source, "status": "ok" if unique else "empty", "hits": unique[:5]}


async def run_niche_search(
    identifiers: IdentifierVector,
    *,
    title: str | None = None,
    artist: str | None = None,
    track_id: str | None = None,
    apply_identity: bool = True,
) -> dict[str, Any]:
    identity_queries = build_identity_queries(title, artist)
    niche_queries = build_niche_queries(identifiers, title=title, artist=artist)
    started = time.monotonic()

    # ── 1. Local in-house fingerprint (always) ──
    local_hits = identify_in_catalog(
        identifiers,
        title=title,
        artist=artist,
        exclude_track_id=track_id,
        limit=8,
    )
    identity_hits = [h for h in local_hits if h["confidence"] >= 0.45]
    id_results: list[dict[str, Any]] = [
        {
            "source": "ultraviolet",
            "status": "ok" if identity_hits else "empty",
            "hits": local_hits,
            "message": "Demucs/librosa catalog fingerprint",
        }
    ]
    niche_results: list[dict[str, Any]] = []

    # ── 2. Optional streaming (disabled by default) ──
    if settings.enable_streaming_identity and not identity_hits:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            stream_results = await asyncio.gather(
                _search_source(
                    client,
                    "spotify",
                    identity_queries,
                    identity=True,
                    title=title,
                    artist=artist,
                    identifiers=identifiers,
                ),
                _search_source(
                    client,
                    "youtube",
                    identity_queries,
                    identity=True,
                    title=title,
                    artist=artist,
                    identifiers=identifiers,
                ),
                _search_source(
                    client,
                    "soundcloud",
                    identity_queries,
                    identity=True,
                    title=title,
                    artist=artist,
                    identifiers=identifiers,
                ),
                _search_source(
                    client,
                    "itunes",
                    identity_queries,
                    identity=True,
                    title=title,
                    artist=artist,
                    identifiers=identifiers,
                ),
            )
            id_results.extend(stream_results)
            stream_identity = [
                h
                for r in stream_results
                for h in r.get("hits", [])
                if h.get("kind") == "identity" and h["confidence"] >= 0.35
            ]
            identity_hits = sorted(stream_identity, key=lambda h: h["confidence"], reverse=True)

            if settings.enable_streaming_niche and not identity_hits:
                niche_results = list(
                    await asyncio.gather(
                        _search_source(
                            client,
                            "spotify",
                            niche_queries,
                            identity=False,
                            title=title,
                            artist=artist,
                            identifiers=identifiers,
                        ),
                        _search_source(
                            client,
                            "youtube",
                            niche_queries,
                            identity=False,
                            title=title,
                            artist=artist,
                            identifiers=identifiers,
                        ),
                        _search_source(
                            client,
                            "soundcloud",
                            niche_queries,
                            identity=False,
                            title=title,
                            artist=artist,
                            identifiers=identifiers,
                        ),
                    )
                )

    niche_hits = [h for r in niche_results for h in r.get("hits", [])]
    all_identity = identity_hits[:6]
    all_niche = niche_hits[:6]
    top = all_identity + [h for h in all_niche if h["url"] not in {x["url"] for x in all_identity}]

    identity_guess = None
    if all_identity:
        best = all_identity[0]
        identity_guess = {
            "title": best["title"],
            "artist": best["artist"],
            "source": best.get("source", "ultraviolet"),
        }
        if apply_identity and track_id:
            from src.recommendation.catalog import update_track_metadata

            update_track_metadata(track_id, title=best["title"], artist=best["artist"])

    return {
        "track_id": track_id,
        "identity_queries": identity_queries,
        "niche_queries": niche_queries,
        "queries": ["local:fingerprint"] + identity_queries + niche_queries,
        "stem_hints": stem_section_hints(identifiers),
        "sources": id_results + niche_results,
        "identity_hits": all_identity,
        "niche_hits": all_niche,
        "top_hits": top[:8],
        "identity_guess": identity_guess,
        "local_only": not settings.enable_streaming_identity,
        "elapsed_ms": int((time.monotonic() - started) * 1000),
    }
