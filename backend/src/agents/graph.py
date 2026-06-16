"""LangGraph state machine definition for the Conductor (Phase 4).

The graph wiring lives here so the orchestration topology is documented from the
start. ``langgraph`` is imported lazily inside ``build_graph`` so the rest of the
backend boots without the dependency installed (it lives in the ``agents`` extra).
"""

from __future__ import annotations

from typing import Literal, TypedDict


class ConductorState(TypedDict, total=False):
    query: str
    intent: Literal["radio", "analyze", "chat", "tree"]
    seed_track_id: str | None
    seed_analysis: dict | None
    user_weights: dict | None
    candidates: list | None
    recommendations: list | None
    tree_chain: list | None
    response: str | None


def build_graph():
    """Construct and compile the Conductor's LangGraph StateGraph.

    Implemented in Phase 4. The intended topology is::

        receive_query -> classify_intent -> route
            radio   -> get_seed_analysis -> get_user_weights -> similarity_search
                    -> apply_niche_scoring -> build_tree_chain -> generate_explanation
            analyze -> run_dj_analysis
            chat    -> get_soul_context -> llm_generate
            tree    -> fetch_tree_data
    """
    raise NotImplementedError("The LangGraph state machine is implemented in Phase 4.")
