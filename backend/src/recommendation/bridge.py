"""Bridge recommendations — multi-hop discovery through the similarity graph.

Walks 2-3 hops from the seed, weighted toward identifiers that were weakest in
the direct search, to reach regions of sonic space that direct similarity misses.
Implemented in Phase 4.
"""

from __future__ import annotations


def find_bridges(seed_track_id: str, direct_matches: list[dict], hops: int = 2) -> list[dict]:
    raise NotImplementedError("Bridge recommendations are implemented in Phase 4.")
