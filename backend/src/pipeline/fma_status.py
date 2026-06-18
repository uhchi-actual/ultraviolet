"""FMA pipeline status — written to disk so UI can verify real progress."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from src.config import settings

# Known full size from server (verified via HEAD).
FMA_ZIP_URL = "https://os.unil.cloud.switch.ch/fma/fma_small.zip"
FMA_ZIP_TOTAL_BYTES = 7_668_127_488  # ~7.14 GiB

_STATUS_FILE = "pipeline_status.json"
_LOCK_FILE = "pipeline.lock"


def _fma_dir() -> Path:
    return Path(settings.fma_dir)


def status_path() -> Path:
    return _fma_dir() / _STATUS_FILE


def lock_path() -> Path:
    return _fma_dir() / _LOCK_FILE


def _embed_count() -> int:
    checkpoint = Path(settings.catalog_dir) / "fma_embed_checkpoint.json"
    if not checkpoint.exists():
        return 0
    try:
        data = json.loads(checkpoint.read_text(encoding="utf-8"))
        return len(data) if isinstance(data, dict) else 0
    except Exception:
        return 0


def _catalog_complete() -> bool:
    npz = Path(settings.catalog_dir).joinpath("fma_clap.npz")
    if not npz.exists() or npz.stat().st_size < 10_000:
        return False
    return _embed_count() >= 100


def read_status() -> dict[str, Any]:
    path = status_path()
    if not path.exists():
        return default_status()
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return default_status()


def write_status(data: dict[str, Any]) -> None:
    path = status_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    data["updated_at"] = time.time()
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def default_status() -> dict[str, Any]:
    zip_path = _fma_dir() / "fma_small.zip"
    downloaded = zip_path.stat().st_size if zip_path.exists() else 0
    total = FMA_ZIP_TOTAL_BYTES
    return {
        "phase": "idle",
        "running": False,
        "download": {
            "bytes": downloaded,
            "total_bytes": total,
            "percent": round(100 * downloaded / total, 2) if total else 0,
            "speed_bps": 0,
            "elapsed_sec": 0,
            "eta_sec": None,
        },
        "extract": {"done": Path(_fma_dir() / "fma_small" / "000" / "000002.mp3").exists()},
        "embed": {
            "done": 0,
            "total": 0,
            "current_title": "",
            "percent": 0,
        },
        "complete": _catalog_complete(),
        "message": "",
        "updated_at": time.time(),
    }


def snapshot_from_disk(prev: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build honest status from filesystem — user can verify bytes on D:."""
    prev = prev or default_status()
    zip_path = _fma_dir() / "fma_small.zip"
    downloaded = zip_path.stat().st_size if zip_path.exists() else 0
    total = FMA_ZIP_TOTAL_BYTES
    now = time.time()

    speed = prev.get("download", {}).get("speed_bps", 0)
    elapsed = prev.get("download", {}).get("elapsed_sec", 0)
    if prev.get("_last_bytes") is not None and prev.get("_last_ts"):
        dt = now - prev["_last_ts"]
        if dt > 0:
            speed = max(0, (downloaded - prev["_last_bytes"]) / dt)
    if prev.get("phase") == "downloading" and prev.get("_started_at"):
        elapsed = now - prev["_started_at"]

    remaining = max(0, total - downloaded)
    eta = int(remaining / speed) if speed > 10 else None

    checkpoint = Path(settings.catalog_dir) / "fma_embed_checkpoint.json"
    embed_done = 0
    if checkpoint.exists():
        try:
            embed_done = len(json.loads(checkpoint.read_text(encoding="utf-8")))
        except Exception:
            pass

    index_path = Path(settings.catalog_dir) / "fma_index.json"
    embed_total = 0
    if index_path.exists():
        try:
            embed_total = len(json.loads(index_path.read_text(encoding="utf-8")))
        except Exception:
            pass
    if embed_total == 0:
        audio_root = _fma_dir() / "fma_small"
        if audio_root.exists():
            embed_total = sum(1 for _ in audio_root.rglob("*.mp3"))

    phase = prev.get("phase", "idle")
    if phase == "idle" and downloaded > 0 and downloaded < total - 1_000_000:
        phase = "downloading"
    if downloaded >= total - 1_000_000:
        phase = prev.get("phase") if prev.get("phase") in ("extracting", "embedding", "complete") else "downloading"

    return {
        "phase": phase,
        "running": lock_path().exists(),
        "download": {
            "bytes": downloaded,
            "total_bytes": total,
            "percent": round(100 * downloaded / total, 2) if total else 0,
            "speed_bps": round(speed, 1),
            "speed_mbps": round(speed / 1_048_576, 2),
            "elapsed_sec": round(elapsed, 1),
            "eta_sec": eta,
        },
        "extract": {"done": Path(_fma_dir() / "fma_small" / "000" / "000002.mp3").exists()},
        "embed": {
            "done": embed_done,
            "total": embed_total,
            "percent": round(100 * embed_done / embed_total, 1) if embed_total else 0,
        },
        "complete": _catalog_complete(),
        "message": prev.get("message", ""),
        "zip_path": str(zip_path),
        "_last_bytes": downloaded,
        "_last_ts": now,
        "_started_at": prev.get("_started_at") or (now if phase == "downloading" else None),
        "updated_at": now,
    }
