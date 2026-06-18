"""Persist the latest radio session for Tree API access."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.config import settings


def _session_path() -> Path:
    return Path(settings.session_dir) / "last_radio.json"


def save_radio_session(payload: dict[str, Any]) -> None:
    path = _session_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_radio_session() -> dict[str, Any] | None:
    path = _session_path()
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else None
