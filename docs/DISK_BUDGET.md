# Disk budget — READ BEFORE INSTALLING

Ultraviolet can download **large** ML artifacts. Everything below should live on **D:** (see `.env.example`), not your C: drive.

## One-time download sizes (approximate)

| Component | Size | Required for |
|-----------|------|--------------|
| PyTorch + CUDA | ~2.5 GB | Demucs separation |
| Demucs `htdemucs` weights | ~80 MB | DJ / Analyze |
| Demucs `htdemucs_ft` (optional) | ~80 MB | Higher-quality mode |
| Ollama JOSIEFIED-Qwen3:8b | ~5 GB | Chat / SOUL only |
| Ollama nomic-embed-text | ~270 MB | Profile ingest only |
| npm `node_modules` | ~400 MB | Frontend dev |
| Python venv (librosa + demucs) | ~3 GB | Backend |

**Analyze-only (no Chat/Profile): ~6 GB on D: drive**  
**Full stack with Ollama: ~12 GB on D: drive**

## Where files go

| Path | Contents |
|------|----------|
| `D:/ultraviolet-data/stems/` | Cached Demucs WAV stems per track |
| `D:/ultraviolet-data/torch/` | PyTorch / Demucs model cache |
| `D:/ultraviolet-data/cache/` | General ML cache |
| `D:/projects/ultraviolet/` | Source code (this repo) |

Copy `.env.example` → `.env` before first run.

## Docker warning

If you use Docker Desktop on Windows, the `docker_data.vhdx` file grows on **C:** and does **not** shrink after `docker prune`.

Before using Docker again, create `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
diskSize=15GB
memory=8GB
swap=0
```

Then run `wsl --shutdown`.

**Local dev without Docker avoids this entirely** — run backend + frontend directly on D:.

## VRAM

Demucs and the 8B LLM cannot run at the same time on 8 GB VRAM. The DJ agent unloads Ollama before Demucs runs automatically.
