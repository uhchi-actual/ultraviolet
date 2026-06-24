"""Extract artist/title from audio files via ID3 tags or filename heuristics."""

from __future__ import annotations

import re
from pathlib import Path

AUDIO_EXTENSIONS = {".mp3", ".flac", ".wav", ".ogg", ".m4a"}


def scan_audio_files(directory: str | Path, *, recursive: bool = True) -> list[Path]:
    root = Path(directory).expanduser().resolve()
    if not root.is_dir():
        raise ValueError(f"Directory not found: {directory}")

    files: list[Path] = []
    iterator = root.rglob("*") if recursive else root.iterdir()
    for path in iterator:
        if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS:
            files.append(path)
    files.sort(key=lambda p: str(p).lower())
    return files


def _clean_tag(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _parse_filename(stem: str) -> tuple[str, str]:
    """Parse 'Artist - Title' or 'Title' from filename stem."""
    for sep in (" - ", " – ", " — ", " _ "):
        if sep in stem:
            left, right = stem.split(sep, 1)
            artist, title = _clean_tag(left), _clean_tag(right)
            if artist and title:
                return artist, title
    if " by " in stem.lower():
        idx = stem.lower().index(" by ")
        title = _clean_tag(stem[:idx])
        artist = _clean_tag(stem[idx + 4 :])
        if title and artist:
            return artist, title
    return "", _clean_tag(stem)


def extract_tags(file_path: str | Path) -> tuple[str, str]:
    """Return (artist, title) from mutagen tags, falling back to filename."""
    path = Path(file_path)
    artist = ""
    title = ""

    try:
        from mutagen import File as MutagenFile

        audio = MutagenFile(path, easy=True)
        if audio is not None:
            tags = audio.tags or {}
            title = _clean_tag(
                (tags.get("title") or [""])[0]
                if isinstance(tags.get("title"), list)
                else tags.get("title", "")
            )
            artist = _clean_tag(
                (tags.get("artist") or [""])[0]
                if isinstance(tags.get("artist"), list)
                else tags.get("artist", "")
            )
            if not artist:
                albumartist = tags.get("albumartist")
                if albumartist:
                    artist = _clean_tag(
                        albumartist[0] if isinstance(albumartist, list) else str(albumartist)
                    )
    except Exception:
        pass

    if not title or not artist:
        file_artist, file_title = _parse_filename(path.stem)
        title = title or file_title
        artist = artist or file_artist

    return artist, title or path.stem
