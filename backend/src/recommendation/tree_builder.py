"""Tree provenance — plain-language explanations tied to the seed track only."""

from __future__ import annotations

from typing import Any

from src.recommendation.catalog_filters import has_user_library
from src.recommendation.vectorize import IDENTIFIER_LABELS, to_feature_vector, top_matching_features

KEY_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")


def _human_detail(feature_key: str, seed_ids: dict[str, Any], cand_ids: dict[str, Any]) -> str:
    if feature_key == "tempo":
        return f"{round(cand_ids.get('tempo', 0))} BPM (seed: {round(seed_ids.get('tempo', 0))} BPM)"
    if feature_key == "key":
        k = int(cand_ids.get("key", 0)) % 12
        mode = "major" if int(cand_ids.get("mode", 0)) == 1 else "minor"
        sk = int(seed_ids.get("key", 0)) % 12
        smode = "major" if int(seed_ids.get("mode", 0)) == 1 else "minor"
        return f"{KEY_NAMES[k]} {mode} (seed: {KEY_NAMES[sk]} {smode})"
    if feature_key == "mode":
        return "major" if int(cand_ids.get("mode", 0)) == 1 else "minor"
    if feature_key in ("energy", "danceability", "instrumentalness", "texture_density", "rhythmic_complexity", "harmonic_darkness"):
        val = float(cand_ids.get(feature_key.replace("_rms", ""), 0) or 0)
        return f"{int(round(val * 100))}%"
    if feature_key == "vocals_stem":
        vp = cand_ids.get("stem_presence", {}).get("vocals_pct", 0)
        return f"{int(round(vp))}% vocal stem"
    if feature_key == "loudness_rms":
        return f"{cand_ids.get('loudness_profile', {}).get('rms_db', 0):.1f} dB RMS"
    return ""


def _explanation(
    label: str,
    feature_key: str,
    seed_meta: dict[str, Any],
    seed_ids: dict[str, Any],
    cand_ids: dict[str, Any],
) -> str:
    seed_title = seed_meta.get("title") or "your seed"
    detail = _human_detail(feature_key, seed_ids, cand_ids)
    if detail:
        return f"Similar {label} — {detail}"
    return f"Close {label} to {seed_title}"


def build_tree_chain(
    recommendation: dict,
    seed_analysis: dict,
    user_weights: dict | None,
    *,
    library_tracks: list[dict] | None = None,
    seed_meta: dict[str, Any] | None = None,
) -> list[dict]:
    """Explain why a candidate matched the seed via top identifier overlaps."""
    from src.recommendation.vectorize import user_weights_from_taste

    del library_tracks  # explanations are seed-relative only unless user library exists
    weights = user_weights_from_taste(user_weights)
    seed_vec = to_feature_vector(seed_analysis)
    cand_vec = to_feature_vector(recommendation["identifiers"])
    matches = top_matching_features(seed_vec, cand_vec, weights, limit=3)

    seed_meta = seed_meta or {}
    seed_ids = seed_analysis if isinstance(seed_analysis, dict) else {}
    cand_ids = recommendation.get("identifiers", {})

    chain: list[dict] = []
    seen_labels: set[str] = set()
    for feature_key, strength in matches:
        label = IDENTIFIER_LABELS.get(feature_key, feature_key.replace("_", " "))
        if label in seen_labels:
            continue
        seen_labels.add(label)
        chain.append(
            {
                "identifier": feature_key,
                "weight": round(min(1.0, strength), 2),
                "source_track": None,
                "match_type": "seed_similarity",
                "explanation": _explanation(label, feature_key, seed_meta, seed_ids, cand_ids),
            }
        )
    return chain


def build_tree_graph(session: dict) -> dict:
    """Seed trunk → recommendation branches. No faux library roots."""
    seed = session.get("seed", {})
    recs = session.get("recommendations", [])
    nodes: list[dict] = []
    edges: list[dict] = []

    if not seed:
        return {"nodes": [], "edges": []}

    nodes.append(
        {
            "id": seed["track_id"],
            "title": seed.get("title", ""),
            "artist": seed.get("artist", ""),
            "type": "seed",
            "plays": seed.get("play_count", 0),
            "identifiers": seed.get("identifiers", {}),
        }
    )

    seen_rec_keys: set[str] = set()
    for rec in recs:
        dedupe = f"{rec.get('artist', '')}|{rec.get('title', '')}".lower()
        if dedupe in seen_rec_keys:
            continue
        seen_rec_keys.add(dedupe)

        chain = rec.get("tree_chain", [])
        summary = chain[0]["explanation"] if chain else f"Sonically close to {seed.get('title', 'your seed')}."
        nodes.append(
            {
                "id": rec["track_id"],
                "title": rec["title"],
                "artist": rec["artist"],
                "type": "ai_recommendation",
                "confidence": rec.get("confidence", 0.0),
                "recommendation_type": rec.get("recommendation_type", "direct"),
                "genre_bucket": rec.get("genre_bucket"),
                "why_summary": summary,
                "why_details": [link.get("explanation", "") for link in chain if link.get("explanation")],
                "identifiers": rec.get("identifiers", {}),
            }
        )
        if chain:
            best = max(chain, key=lambda link: link.get("weight", 0))
            edges.append(
                {
                    "source": seed["track_id"],
                    "target": rec["track_id"],
                    "weight": best.get("weight", 0.5),
                    "kind": "trunk",
                }
            )

    # Real user library roots only (Spotify history ingest)
    if has_user_library(session.get("library")):
        seen_library: set[str] = set()
        for rec in recs:
            for link in rec.get("tree_chain", []):
                source = link.get("source_track")
                if not source or source["id"] in seen_library:
                    continue
                seen_library.add(source["id"])
                lib = _library_node(source["id"], session)
                if lib:
                    nodes.append(lib)
                    edges.append(
                        {
                            "source": lib["id"],
                            "target": rec["track_id"],
                            "weight": link.get("weight", 0.5),
                            "kind": "root",
                        }
                    )

    return {"nodes": nodes, "edges": edges}


def _library_node(track_id: str, session: dict) -> dict | None:
    for track in session.get("library", []):
        if track.get("track_id") == track_id:
            return {
                "id": track["track_id"],
                "title": track["title"],
                "artist": track["artist"],
                "type": "library",
                "plays": track.get("play_count", 0),
                "identifiers": track.get("identifiers", {}),
            }
    return None
