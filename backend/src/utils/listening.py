"""Parse personal listening data (Spotify history) into normalized play events,
then derive listening statistics and natural-language documents for SOUL's RAG
pipeline.

Supports both Spotify export shapes:
  * Extended streaming history: ``ts`` / ``ms_played`` /
    ``master_metadata_track_name`` / ``master_metadata_album_artist_name``.
  * Basic streaming history: ``endTime`` / ``trackName`` / ``artistName`` /
    ``msPlayed``.

Pure standard-library logic so it is fast and unit-testable without services.
"""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime

# A play shorter than this is treated as a skip.
_SKIP_MS = 30_000
_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@dataclass
class PlayEvent:
    ts: datetime
    artist: str
    track: str
    ms_played: int
    skipped: bool


@dataclass
class ListeningStats:
    total_events: int = 0
    total_tracks: int = 0
    total_hours: float = 0.0
    heatmap: list[list[float]] = field(default_factory=list)  # 7 x 24, minutes
    top_artists: list[dict] = field(default_factory=list)
    top_tracks: list[dict] = field(default_factory=list)
    peak_slot: tuple[int, int] | None = None  # (weekday, hour)
    first_ts: datetime | None = None
    last_ts: datetime | None = None


def _parse_ts(raw: object) -> datetime | None:
    if not isinstance(raw, str):
        return None
    text = raw.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        try:
            dt = datetime.strptime(text, "%Y-%m-%d %H:%M")
        except ValueError:
            return None
    # Drop tzinfo so every event is comparable (naive, wall-clock).
    return dt.replace(tzinfo=None)


def _parse_item(item: object) -> PlayEvent | None:
    if not isinstance(item, dict):
        return None

    if "master_metadata_track_name" in item or "ms_played" in item or "ts" in item:
        track = item.get("master_metadata_track_name")
        artist = item.get("master_metadata_album_artist_name")
        ts_raw = item.get("ts")
        ms = int(item.get("ms_played") or 0)
        skipped = bool(item.get("skipped")) or ms < _SKIP_MS
    else:
        track = item.get("trackName")
        artist = item.get("artistName")
        ts_raw = item.get("endTime")
        ms = int(item.get("msPlayed") or 0)
        skipped = ms < _SKIP_MS

    ts = _parse_ts(ts_raw)
    if not track or not artist or ts is None:
        return None
    return PlayEvent(
        ts=ts, artist=str(artist).strip(), track=str(track).strip(), ms_played=ms, skipped=skipped
    )


def parse_history(raw: bytes) -> list[PlayEvent]:
    """Decode a Spotify history export into normalized play events."""
    data = json.loads(raw.decode("utf-8", errors="replace"))
    if isinstance(data, dict):
        for key in ("items", "data", "streamingHistory"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
        else:
            data = []
    if not isinstance(data, list):
        return []
    return [ev for item in data if (ev := _parse_item(item)) is not None]


def compute_stats(events: list[PlayEvent]) -> ListeningStats:
    """Aggregate play events into heatmap, top artists/tracks, and totals."""
    stats = ListeningStats(heatmap=[[0.0] * 24 for _ in range(7)])
    if not events:
        return stats

    artist_ms: dict[str, float] = defaultdict(float)
    artist_plays: dict[str, int] = defaultdict(int)
    artist_skips: dict[str, int] = defaultdict(int)
    track_plays: dict[tuple[str, str], int] = defaultdict(int)
    track_ms: dict[tuple[str, str], float] = defaultdict(float)
    total_ms = 0.0

    for ev in events:
        minutes = ev.ms_played / 60_000
        stats.heatmap[ev.ts.weekday()][ev.ts.hour] += minutes
        artist_ms[ev.artist] += minutes
        artist_plays[ev.artist] += 1
        if ev.skipped:
            artist_skips[ev.artist] += 1
        key = (ev.artist, ev.track)
        track_plays[key] += 1
        track_ms[key] += minutes
        total_ms += ev.ms_played
        stats.first_ts = ev.ts if stats.first_ts is None else min(stats.first_ts, ev.ts)
        stats.last_ts = ev.ts if stats.last_ts is None else max(stats.last_ts, ev.ts)

    stats.heatmap = [[round(m, 1) for m in row] for row in stats.heatmap]
    stats.total_events = len(events)
    stats.total_tracks = len(track_plays)
    stats.total_hours = round(total_ms / 3_600_000, 1)

    stats.top_artists = sorted(
        (
            {
                "artist": artist,
                "plays": artist_plays[artist],
                "hours": round(artist_ms[artist] / 60, 1),
                "skip_rate": round(artist_skips[artist] / artist_plays[artist], 2),
            }
            for artist in artist_ms
        ),
        key=lambda a: a["hours"],
        reverse=True,
    )[:30]

    stats.top_tracks = sorted(
        (
            {"track": track, "artist": artist, "plays": plays}
            for (artist, track), plays in track_plays.items()
        ),
        key=lambda t: t["plays"],
        reverse=True,
    )[:20]

    # Peak listening slot (weekday, hour).
    peak_val = -1.0
    for day in range(7):
        for hour in range(24):
            if stats.heatmap[day][hour] > peak_val:
                peak_val = stats.heatmap[day][hour]
                stats.peak_slot = (day, hour)

    return stats


def build_documents(stats: ListeningStats) -> list[str]:
    """Turn listening stats into short natural-language docs for RAG embedding."""
    docs: list[str] = []

    span = ""
    if stats.first_ts and stats.last_ts:
        span = f" between {stats.first_ts:%b %Y} and {stats.last_ts:%b %Y}"
    peak = ""
    if stats.peak_slot:
        day, hour = stats.peak_slot
        peak = f" Listening peaks around {hour:02d}:00 on {_DAYS[day]}."
    docs.append(
        f"This listener logged {stats.total_events} plays across "
        f"{stats.total_tracks} unique tracks ({stats.total_hours} hours){span}.{peak}"
    )

    for rank, a in enumerate(stats.top_artists, start=1):
        skip_note = (
            " They skip it often."
            if a["skip_rate"] > 0.4
            else " They rarely skip it."
            if a["skip_rate"] < 0.1
            else ""
        )
        docs.append(
            f"#{rank} most-played artist: {a['artist']} — {a['plays']} plays, "
            f"{a['hours']} hours of listening.{skip_note}"
        )

    if stats.top_tracks:
        top = ", ".join(f"{t['track']} by {t['artist']}" for t in stats.top_tracks[:10])
        docs.append(f"Most-played tracks: {top}.")

    return docs


def chunk_text(text: str, size: int = 512, overlap: int = 64) -> list[str]:
    """Word-based chunker (~``size`` tokens, ``overlap`` token overlap)."""
    words = text.split()
    if not words:
        return []
    step = max(size - overlap, 1)
    return [" ".join(words[i : i + size]) for i in range(0, len(words), step)]
