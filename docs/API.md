# API Reference

> Status: Phase 1 stub. Full schemas in the PRD §9. Interactive docs at
> `http://localhost:8000/docs` when the backend is running.

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/health` | implemented | Health check for all services |
| POST | `/api/chat` | implemented | Conversational interaction via the Conductor |
| POST | `/api/radio` | stub | Generate recommendations from a seed track |
| POST | `/api/analyze` | stub | Upload + analyze an audio file |
| GET | `/api/tree/{recommendation_id}` | stub | Tree provenance for a recommendation |
| GET | `/api/tree/full` | stub | Full Tree graph |
| GET | `/api/profile` | stub | SOUL user profile data |
| POST | `/api/ingest` | stub | Ingest personal data (Spotify history, etc.) |

Stub endpoints return `501 Not Implemented` until their phase lands.
