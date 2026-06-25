# Setup

## Prerequisites

- Node.js 22+
- Python 3.12+
- Docker Desktop (for the full stack) with the NVIDIA container runtime for GPU
- An NVIDIA GPU with ≥8GB VRAM (for the LLM); CPU-only works for everything except LLM inference

## Full stack (Docker)

```bash
cp .env.example .env
docker compose up --build
docker exec ultraviolet-ollama-1 ollama pull goekdenizguelmez/JOSIEFIED-Qwen3:8b
docker exec ultraviolet-ollama-1 ollama pull nomic-embed-text
```

## Local dev (no Docker) — one command

**First time only** (backend venv + deps):
```powershell
cd <repo>\backend
python -m venv .venv
.\.venv\Scripts\pip install -e ".[audio,demucs,dev]"
cd ..
npm run install:all
copy .env.example .env
```

**Every time** — double-click `START.bat` in the project folder, **or** from the project root:
```powershell
npm run dev
```

Then open **http://localhost:3000**. One terminal runs backend (8000) and frontend (3000) together. Ctrl+C stops both.

## Backend only (local)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -e ".[dev]"
uvicorn src.main:app --reload --port 8000
```

## Frontend only (local)

```bash
cd frontend
npm install
npm run dev
```

## Environment variables

See [`.env.example`](../.env.example) for the full list.
