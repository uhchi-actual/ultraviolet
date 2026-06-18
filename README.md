# Ultraviolet

> Multi-Agent Music Recommendation Engine with Explainable Traceback Tree

Ultraviolet is a locally-deployed, content-based music recommendation engine. It
understands a user's musical identity through personal-data ingestion (RAG) and
real-time audio analysis, then generates niche, explainable recommendations with
an interactive Tree showing **why** each track was suggested.

Unlike collaborative filtering ("users who played X also played Y"), Ultraviolet
analyzes the audio itself, so a track with 12 plays gets the same 15-identifier
fingerprint as one with 50 million streams. The system actively surfaces
lesser-known artists.

See [`ULTRAVIOLET_PRD.md`](../ultraviolet/ULTRAVIOLET_PRD.md) for the full product spec.

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
- **DJ** — extracts a 15-identifier audio fingerprint from any track (pure DSP/ML).
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

Static client-side demo — no install, no backend. Tree and catalog search run in the browser over 7,994 FMA tracks.

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

## Status (2026-06)

**Public demo:** static GitHub Pages build (`frontend/` → `out/`). See [`HANDOFF.md`](HANDOFF.md) for resume notes.

**Local full stack:** FastAPI + CLAP/Demucs analysis, FMA 8K catalog on `D:\ultraviolet-data\`, multi-driver scoring, manual tree API.

- [x] Static Tree + FMA search in-browser (GitHub Pages)
- [x] FMA 8K catalog + CLAP embeddings pipeline
- [x] Multi-driver scoring (CLAP + spectral + graph + MMR)
- [x] DJ analysis pipeline (Demucs stems, 15 identifiers)
- [ ] SOUL profile RAG (Chroma + ingest)
- [ ] Conductor chat with live recommendations
- [ ] Radio playback

Earlier Phase 1 scaffolding (Docker, theme, routes) remains; see git history.

---

## Tech stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS v4, React Flow, Framer Motion, D3, Recharts, shadcn/ui
**Backend:** FastAPI, LangGraph, Ollama, librosa, essentia, ChromaDB, SQLModel, Pydantic v2
**Data:** PostgreSQL 16, ChromaDB
**Infra:** Docker Compose, GitHub Actions, Ollama (JOSIEFIED-Qwen3:8b)
