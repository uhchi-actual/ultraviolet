"""SOUL — Stratified Operating Unit Link (user profiler).

Builds and maintains a living profile of the user's musical identity from
personal data via a RAG pipeline over ChromaDB (Phase 3):

  ingest → parse history → embed documents (nomic-embed-text) → store in the
  ``soul_personal_data`` collection → synthesize a taste profile (top artists →
  local LLM → 15-dim taste vector + genres) → persist to PostgreSQL.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime

import httpx

from src.config import settings
from src.models.identifiers import UserTasteVector
from src.models.user import TASTE_KEYS, coerce_taste, neutral_taste
from src.utils.embeddings import embed_text
from src.utils.listening import build_documents, compute_stats, parse_history

logger = logging.getLogger("ultraviolet.soul")

USER_ID = "default"
_EMBED_CONCURRENCY = 4
_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)

_TASTE_GUIDE = (
    "valence_weight (positive/happy mood), energy_weight (intensity/arousal), "
    "danceability_weight (groove), acousticness_weight (acoustic vs electronic), "
    "tempo_weight (fast tempos), key_mode_weight (tonality focus), "
    "instrumentalness_weight (instrumental over vocals), loudness_weight (loud/compressed), "
    "texture_density_weight (dense, layered sound), emotional_arc_weight (dynamic builds), "
    "vocal_character_weight (distinctive vocals), rhythmic_complexity_weight (syncopation), "
    "production_aesthetic_weight (hi-fi polish), harmonic_darkness_weight (dark/minor moods), "
    "instrumentation_weight (rich instrumentation)"
)


class Soul:
    """User profiling + retrieval-augmented generation over personal data."""

    collection_name = "soul_personal_data"

    def __init__(self, model: str | None = None, host: str | None = None) -> None:
        self.model = model or settings.ollama_model
        self.host = host or settings.ollama_host

    # ── Public API ──────────────────────────────────────────────────────────

    async def ingest(self, file_bytes: bytes, data_type: str) -> dict:
        """Ingest a personal-data file: store RAG chunks and rebuild the profile."""
        from src.utils.listening import chunk_text

        documents_processed = 0
        profile_updated = False

        if data_type == "personal_text":
            text = file_bytes.decode("utf-8", errors="replace")
            chunks = chunk_text(text)
            documents_processed = len(chunks)
            if not chunks:
                raise ValueError("The uploaded text file was empty.")
        else:
            events = parse_history(file_bytes)
            if not events:
                raise ValueError(
                    "No playable history found. Expected a Spotify streaming-history "
                    "JSON export (extended or basic format)."
                )
            documents_processed = len(events)
            stats = compute_stats(events)
            chunks = build_documents(stats)
            await self._save_profile(stats)
            profile_updated = True

        chunks_created = await self._store_chunks(chunks)

        return {
            "status": "ingested",
            "documents_processed": documents_processed,
            "chunks_created": chunks_created,
            "profile_updated": profile_updated,
        }

    async def get_profile(self) -> dict | None:
        """Return the persisted profile shaped for GET /api/profile, or None."""
        row = await asyncio.to_thread(self._load_profile_row)
        if row is None:
            return None
        return {
            "taste_vector": row.taste_vector or neutral_taste(),
            "top_genres": row.top_genres or [],
            "top_artists": row.top_artists or [],
            "listening_heatmap": row.listening_heatmap or [],
            "taste_drift": {},
            "total_tracks_analyzed": row.total_tracks,
            "total_listening_hours": row.total_listening_hours,
            "last_updated": row.last_profile_update.isoformat(),
        }

    async def get_profile_summary(self) -> str | None:
        """A short natural-language taste summary for the Conductor's context."""
        profile = await self.get_profile()
        if profile is None:
            return None
        genres = ", ".join(g["genre"] for g in profile["top_genres"][:5]) or "unknown yet"
        taste = profile["taste_vector"]
        top = sorted(taste.items(), key=lambda kv: kv[1], reverse=True)[:3]
        traits = ", ".join(k.replace("_weight", "").replace("_", " ") for k, _ in top)
        return (
            f"Top genres: {genres}. They most value: {traits}. "
            f"{profile['total_tracks_analyzed']} tracks analyzed, "
            f"{profile['total_listening_hours']} listening hours."
        )

    async def get_user_weights(self) -> UserTasteVector:
        """15-dim preference weights for recommendation math (neutral=1.0)."""
        try:
            profile = await self.get_profile()
        except Exception as exc:  # noqa: BLE001 — degrade to neutral without a DB
            logger.debug("Profile unavailable for weights (%s); using neutral.", exc)
            profile = None
        if profile is None:
            return UserTasteVector()
        taste = coerce_taste(profile["taste_vector"])
        # Map 0..1 preference strength to a 0.5..1.5 multiplier centered on 1.0.
        return UserTasteVector(**{key: round(0.5 + taste[key], 3) for key in TASTE_KEYS})

    # ── Internals ───────────────────────────────────────────────────────────

    async def _store_chunks(self, chunks: list[str]) -> int:
        if not chunks:
            return 0

        sem = asyncio.Semaphore(_EMBED_CONCURRENCY)

        async def _embed(text: str) -> list[float]:
            async with sem:
                return await embed_text(text)

        embeddings = await asyncio.gather(*(_embed(c) for c in chunks))
        await asyncio.to_thread(self._write_collection, chunks, embeddings)
        return len(chunks)

    def _write_collection(self, chunks: list[str], embeddings: list[list[float]]) -> None:
        from src.db.chroma import SOUL_PERSONAL_DATA, get_client

        client = get_client()
        # Reset so re-ingestion fully replaces the prior corpus.
        try:
            client.delete_collection(SOUL_PERSONAL_DATA)
        except Exception:  # noqa: BLE001 — fine if it didn't exist yet
            pass
        collection = client.get_or_create_collection(SOUL_PERSONAL_DATA)
        collection.add(
            ids=[f"doc_{i}" for i in range(len(chunks))],
            embeddings=embeddings,
            documents=chunks,
        )

    async def _save_profile(self, stats) -> None:
        taste, genres = await self._synthesize_taste(stats.top_artists)
        await asyncio.to_thread(self._upsert_profile, stats, taste, genres)

    async def _synthesize_taste(self, top_artists: list[dict]) -> tuple[dict, list[dict]]:
        """Ask the local LLM to infer taste weights + genres from top artists."""
        if not top_artists:
            return neutral_taste(), []

        artist_lines = "\n".join(
            f"- {a['artist']} ({a['plays']} plays)" for a in top_artists[:25]
        )
        prompt = (
            "/no_think\n"
            "You are a music taste analyst. Based on this listener's most-played "
            "artists, infer their preferences. Use your knowledge of each artist's "
            "genre and sonic character.\n\n"
            f"Most-played artists:\n{artist_lines}\n\n"
            "Respond with ONLY JSON of this exact shape:\n"
            '{"taste_vector": {<15 weights, each 0.0-1.0>}, '
            '"top_genres": [{"genre": "name", "weight": 0.0-1.0}]}\n\n'
            f"The 15 taste_vector keys and meaning: {_TASTE_GUIDE}.\n"
            "Each weight is how strongly this listener prefers that quality "
            "(0 = not at all, 1 = very strongly). Provide 4-8 genres whose weights "
            "sum to about 1.0, most important first."
        )

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{self.host}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": 0.4},
                    },
                )
                resp.raise_for_status()
                content = resp.json().get("message", {}).get("content", "")
            parsed = json.loads(_THINK_RE.sub("", content).strip())
        except (httpx.HTTPError, json.JSONDecodeError, KeyError) as exc:
            logger.warning("Taste synthesis failed (%s); using neutral profile.", exc)
            return neutral_taste(), []

        taste = coerce_taste(parsed.get("taste_vector"))
        genres = self._coerce_genres(parsed.get("top_genres"))
        return taste, genres

    @staticmethod
    def _coerce_genres(raw: object) -> list[dict]:
        if not isinstance(raw, list):
            return []
        cleaned: list[dict] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            name = item.get("genre") or item.get("name")
            weight = item.get("weight")
            if isinstance(name, str) and isinstance(weight, (int, float)):
                cleaned.append({"genre": name.strip(), "weight": max(float(weight), 0.0)})
        cleaned.sort(key=lambda g: g["weight"], reverse=True)
        cleaned = cleaned[:8]
        total = sum(g["weight"] for g in cleaned) or 1.0
        for g in cleaned:
            g["weight"] = round(g["weight"] / total, 3)
        return cleaned

    # ── Persistence (sync; run via asyncio.to_thread) ─────────────────────────

    @staticmethod
    def _load_profile_row():
        from sqlmodel import Session

        from src.db.postgres import get_engine
        from src.models.user import UserProfile

        with Session(get_engine()) as session:
            return session.get(UserProfile, USER_ID)

    @staticmethod
    def _upsert_profile(stats, taste: dict, genres: list[dict]) -> None:
        from sqlmodel import Session

        from src.db.postgres import get_engine
        from src.models.user import UserProfile

        now = datetime.utcnow()
        with Session(get_engine()) as session:
            row = session.get(UserProfile, USER_ID)
            if row is None:
                row = UserProfile(id=USER_ID, created_at=now)
            row.taste_vector = taste
            row.top_genres = genres
            row.top_artists = stats.top_artists[:15]
            row.listening_heatmap = stats.heatmap
            row.total_tracks = stats.total_tracks
            row.total_listening_hours = stats.total_hours
            row.last_profile_update = now
            session.add(row)
            session.commit()
