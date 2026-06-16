# Architecture

> Status: Phase 1 stub. Expanded in Phase 5.

Ultraviolet is a multi-agent system orchestrated by LangGraph, served by FastAPI,
and presented through a Next.js 15 frontend.

## Agents

| Agent | Role | LLM? | Key tech |
|-------|------|------|----------|
| **SOUL** | User profiler (RAG over personal data) | yes (synthesis) | ChromaDB, nomic-embed-text |
| **DJ** | Audio analyzer (15-identifier fingerprint) | no | librosa, essentia |
| **Conductor** | Orchestrator + recommender + explainer | yes | LangGraph, Ollama |

## Request flow

1. Frontend (Next.js) → REST → Backend (FastAPI).
2. Backend routes through the Conductor (LangGraph state machine).
3. Conductor delegates to SOUL and DJ as needed.
4. Conductor synthesizes results + generates explanations via Ollama.
5. Results + Tree provenance returned to the frontend.

See the PRD §2 for the full system diagram.
