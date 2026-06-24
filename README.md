# Ultraviolet

> Browser-only music discovery demo with an explainable recommendation Tree.

**Live demo:** https://uhchi-actual.github.io/ultraviolet/

Open the Tree, paste songs you already play, and generate a client-side discovery
graph.

Ultraviolet is a content-based music recommendation engine. Unlike collaborative
filtering ("users who played X also played Y"), it scores audio/catalog features
directly and shows the recommendation chain in an interactive Tree.

---

## Architecture

```
Next.js 15 (frontend)  ──REST──►  FastAPI (backend)
                                     │
                         ┌───────────┼───────────┐
                       SOUL          DJ        Conductor
                    (profiler)   (analyzer)  (orchestrator)
                         │           │            │
                     ChromaDB    librosa/      Ollama
                     (vectors)   essentia      (LLM)
                         └───────────┴────────────┘
                                     │
                              PostgreSQL
```

Three agents, orchestrated by LangGraph:

- **SOUL** — builds a living profile of the user's taste from personal data (RAG).
- **DJ** — extracts a 15 point identifier audio fingerprint from any track (pure DSP/ML).
- **Conductor** — routes queries, runs the recommendation engine, builds the Tree,
  and generates natural-language explanations via a local LLM.

---

## Repository layout

```
ultraviolet/
├── docker-compose.yml      # 5 services: frontend, backend, postgres, chromadb, ollama
├── frontend/               # Next.js 15 + Tailwind v4 (App Router)
├── backend/                # FastAPI + LangGraph + librosa/essentia
├── data/                   # Local audio + personal-data exports (gitignored)
└── docs/                   # Architecture / identifiers / API / tree / setup
```

---

## Live demo (GitHub Pages)

**https://uhchi-actual.github.io/ultraviolet/**

Static client-side demo

| Page | Static demo |
|------|-------------|
| Tree | Full — type `Artist - Title`, build constellation |
| Analyze | Catalog search only (upload needs local stack) |
| Chat / Radio / Profile | Local stack only |

---

## Quick start

### Option A — Docker (full stack)

> Requires Docker Desktop with the NVIDIA container runtime for GPU access.

```bash
cp .env.example .env
docker compose up --build

# Once Ollama is up, pull the models:
docker exec ultraviolet-ollama-1 ollama pull goekdenizguelmez/JOSIEFIED-Qwen3:8b
docker exec ultraviolet-ollama-1 ollama pull nomic-embed-text
```

- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

### Option B — Local dev (no Docker)

**Backend**

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Unix:     source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.main:app --reload --port 8000
```

> Note: `librosa` and (especially) `essentia` are heavy native packages that
> are easiest to install inside the Linux backend container. The FastAPI app
> boots without them — audio analysis modules import them lazily.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

## Tech stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS v4, React Flow, Framer Motion, D3, Recharts, shadcn/ui
**Backend:** FastAPI, LangGraph, Ollama, librosa, essentia, ChromaDB, SQLModel, Pydantic v2
**Data:** PostgreSQL 16, ChromaDB
**Infra:** Docker Compose, GitHub Actions, Ollama (JOSIEFIED-Qwen3:8b)
