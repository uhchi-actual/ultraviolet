"""Genre buckets for diverse recommendation picking."""

from __future__ import annotations

from typing import Any

GENRE_BUCKETS = (
    "darkwave",
    "post_punk",
    "electronic",
    "dance",
    "ambient",
    "industrial",
    "indie",
    "synth",
)


def infer_genre_bucket(track: dict[str, Any]) -> str:
    """Infer a pseudo-genre from identifier markers (no external genre tags needed)."""
    ids = track.get("identifiers", {})
    tempo = float(ids.get("tempo", 120))
    energy = float(ids.get("energy", 0.5))
    dance = float(ids.get("danceability", 0.5))
    darkness = float(ids.get("harmonic_darkness", 0.5))
    texture = float(ids.get("texture_density", 0.5))
    rhythm = float(ids.get("rhythmic_complexity", 0.5))
    vocals = float(ids.get("stem_presence", {}).get("vocals_pct", 15))

    if darkness >= 0.72 and tempo < 135:
        return "darkwave"
    if darkness >= 0.6 and rhythm >= 0.45:
        return "post_punk"
    if dance >= 0.72 and tempo >= 118:
        return "dance"
    if energy >= 0.72 and rhythm >= 0.5:
        return "electronic"
    if energy <= 0.42 and texture >= 0.55:
        return "ambient"
    if texture >= 0.7 and vocals <= 12:
        return "industrial"
    if tempo >= 110 and dance >= 0.55 and darkness < 0.5:
        return "synth"
    return "indie"


def pick_genre_diverse(
    scored: list[dict[str, Any]],
    count: int,
    *,
    min_per_bucket: int = 1,
) -> list[dict[str, Any]]:
    """Pick recommendations ensuring spread across sonic genre buckets."""
    if not scored:
        return []

    by_bucket: dict[str, list[dict[str, Any]]] = {}
    for item in scored:
        bucket = infer_genre_bucket(item["track"])
        by_bucket.setdefault(bucket, []).append(item)

    picked: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    # Round-robin across buckets for diversity
    buckets = sorted(by_bucket.keys(), key=lambda b: -len(by_bucket[b]))
    round_idx = 0
    while len(picked) < count and buckets:
        bucket = buckets[round_idx % len(buckets)]
        pool = by_bucket.get(bucket, [])
        added = False
        while pool:
            item = pool.pop(0)
            tid = item["track"]["track_id"]
            if tid in seen_ids:
                continue
            seen_ids.add(tid)
            item = {**item, "genre_bucket": bucket}
            picked.append(item)
            added = True
            break
        if not added:
            buckets = [b for b in buckets if by_bucket.get(b)]
        round_idx += 1
        if round_idx > count * 4:
            break

    # Fill remaining slots by score
    for item in scored:
        if len(picked) >= count:
            break
        tid = item["track"]["track_id"]
        if tid in seen_ids:
            continue
        seen_ids.add(tid)
        picked.append({**item, "genre_bucket": infer_genre_bucket(item["track"])})

    return picked[:count]
