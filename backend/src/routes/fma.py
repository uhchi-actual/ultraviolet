"""FMA pipeline status + automation."""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter

router = APIRouter()


def _format_eta(sec: int | None) -> str:
    if sec is None or sec < 0:
        return "—"
    h, rem = divmod(int(sec), 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h {m:02d}m {s:02d}s"
    return f"{m:02d}m {s:02d}s"


def _format_bytes(n: int) -> str:
    return f"{n / 1_073_741_824:.2f} GB"


@router.get("/fma/status")
def fma_status() -> dict[str, Any]:
    from src.pipeline.fma_status import read_status, snapshot_from_disk, write_status

    status = snapshot_from_disk(read_status())
    write_status(status)

    dl = status.get("download", {})
    elapsed = dl.get("elapsed_sec", 0)
    return {
        **status,
        "server_now": time.time(),
        "download": {
            **dl,
            "bytes_human": _format_bytes(dl.get("bytes", 0)),
            "total_human": _format_bytes(dl.get("total_bytes", 0)),
            "elapsed_human": _format_eta(int(elapsed)),
            "eta_human": _format_eta(dl.get("eta_sec")),
        },
    }


@router.post("/fma/start")
def fma_start() -> dict[str, Any]:
    """Launch full pipeline in background (download wait → extract → embed)."""
    from src.pipeline.fma_status import lock_path, read_status

    if lock_path().exists():
        return {"started": False, "message": "Pipeline already running", "status": read_status()}

    backend = Path(__file__).resolve().parents[2]
    script = backend / "src" / "pipeline" / "fma_pipeline.py"
    python = backend / ".venv" / "Scripts" / "python.exe"
    if not python.exists():
        python = Path(sys.executable)

    from src.pipeline.fma_status import _catalog_complete

    args = [str(python), str(script)]
    if _catalog_complete():
        return {"started": False, "message": "Catalog already complete"}
    if Path(__import__("src.config", fromlist=["settings"]).settings.fma_dir).joinpath("fma_small", "000", "000002.mp3").exists():
        args.append("--embed-only")

    subprocess.Popen(
        args,
        cwd=str(backend),
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
        close_fds=True,
    )
    return {"started": True, "message": "Pipeline started"}


@router.post("/fma/watch")
def fma_watch() -> dict[str, Any]:
    """Start status watcher only (monitors curl download, then auto-continues)."""
    return fma_start()
