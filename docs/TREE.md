# The Tree (Explainable Traceback)

> Status: Phase 1 stub. Implemented in Phase 4.

The Tree is the flagship visualization: an interactive, force-directed graph that
shows **why** each track was recommended. Built with React Flow (`@xyflow/react`)
for rendering and D3 force simulation for layout.

## Node types

- **Seed** — the track the user seeded (red, larger, pulsing).
- **Library** — a track from the user's library (purple, sized by play count).
- **AI recommendation** — a generated recommendation (teal, sized by confidence).

## Edges

Each edge represents an identifier match between two tracks, labeled with the
identifier name and weighted by match strength.

See the PRD §8.3 for full interaction and animation specs.
