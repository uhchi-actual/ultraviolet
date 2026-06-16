"""Tree provenance chain construction (Phase 4).

For each recommendation, identifies which identifiers drove the match and traces
them back to the user's library tracks, producing the explainable Tree chain.
"""

from __future__ import annotations


def build_tree_chain(recommendation: dict, seed_analysis: dict, user_weights: dict) -> list[dict]:
    raise NotImplementedError("Tree provenance chains are implemented in Phase 4.")
