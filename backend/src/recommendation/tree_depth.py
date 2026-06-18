"""Scale recommendation counts and build multi-level branches."""


def tree_depth_config(num_seeds: int) -> tuple[int, int, int]:
    """Return (level1_per_seed, level2_per_branch, level3_per_branch)."""
    if num_seeds <= 1:
        return 24, 4, 2
    if num_seeds <= 3:
        return 16, 3, 2
    if num_seeds <= 5:
        return 12, 2, 1
    return 8, 2, 1


def graph_node_id(track_id: str, parent_id: str | None = None) -> str:
    """Unique graph node id — same catalog track may appear on multiple branches."""
    if not parent_id:
        return track_id
    return f"{track_id}::{parent_id}"
