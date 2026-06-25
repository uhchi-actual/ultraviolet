"""Low-level search clients for NicheSearch (Innertube, SoundCloud, iTunes, Spotify)."""

from __future__ import annotations

import logging
import re
import time
from typing import Any

import httpx

from src.config import settings

logger = logging.getLogger("ultraviolet.streaming")

_SC_CID_CACHE: tuple[str, float] | None = None
_INNERTUBE_CACHE: tuple[str, str, float] | None = None
_CACHE_TTL = 3600.0

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


async def spotify_token(client: httpx.AsyncClient) -> str | None:
    cid = settings.spotify_client_id.strip()
    secret = settings.spotify_client_secret.strip()
    if not cid or not secret:
        return None
    try:
        res = await client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            auth=(cid, secret),
            timeout=12.0,
        )
        res.raise_for_status()
        return res.json().get("access_token")
    except Exception as exc:
        logger.warning("Spotify token failed: %s", exc)
        return None


async def fetch_soundcloud_client_id(client: httpx.AsyncClient) -> str | None:
    global _SC_CID_CACHE
    now = time.monotonic()
    if _SC_CID_CACHE and now - _SC_CID_CACHE[1] < _CACHE_TTL:
        return _SC_CID_CACHE[0]

    configured = settings.soundcloud_client_id.strip()
    if configured:
        _SC_CID_CACHE = (configured, now)
        return configured

    try:
        page = await client.get(
            "https://soundcloud.com",
            headers={"User-Agent": BROWSER_UA},
            timeout=12.0,
        )
        page.raise_for_status()
        scripts = re.findall(r'https://[^"\']+sndcdn\.com[^"\']+\.js', page.text)
        patterns = (
            r'client_id:"([A-Za-z0-9]+)"',
            r"client_id:'([A-Za-z0-9]+)'",
            r'clientId:"([A-Za-z0-9]+)"',
            r"client_id=([A-Za-z0-9]{16,32})",
        )
        for url in scripts[-10:]:
            js = await client.get(url, headers={"User-Agent": BROWSER_UA}, timeout=12.0)
            for pat in patterns:
                m = re.search(pat, js.text)
                if m:
                    cid = m.group(1)
                    _SC_CID_CACHE = (cid, now)
                    return cid
    except Exception as exc:
        logger.warning("SoundCloud client_id fetch failed: %s", exc)

    return configured or None


async def fetch_innertube_config(client: httpx.AsyncClient) -> tuple[str, str] | None:
    global _INNERTUBE_CACHE
    now = time.monotonic()
    if _INNERTUBE_CACHE and now - _INNERTUBE_CACHE[2] < _CACHE_TTL:
        return _INNERTUBE_CACHE[0], _INNERTUBE_CACHE[1]

    try:
        page = await client.get(
            "https://www.youtube.com", headers={"User-Agent": BROWSER_UA}, timeout=12.0
        )
        page.raise_for_status()
        key_m = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', page.text)
        ver_m = re.search(r'"INNERTUBE_CLIENT_VERSION":"([^"]+)"', page.text)
        if key_m:
            key = key_m.group(1)
            ver = ver_m.group(1) if ver_m else "2.20250201.01.00"
            _INNERTUBE_CACHE = (key, ver, now)
            return key, ver
    except Exception as exc:
        logger.warning("Innertube config fetch failed: %s", exc)
    return None


def parse_innertube_videos(payload: dict[str, Any]) -> list[dict[str, str]]:
    hits: list[dict[str, str]] = []

    def walk(obj: Any) -> None:
        if isinstance(obj, dict):
            vr = obj.get("videoRenderer")
            if isinstance(vr, dict):
                vid = vr.get("videoId")
                title = _innertube_text(vr.get("title"))
                author = _innertube_text(vr.get("ownerText") or vr.get("longBylineText"))
                if vid and title:
                    hits.append(
                        {
                            "title": title,
                            "artist": author,
                            "video_id": vid,
                            "url": f"https://www.youtube.com/watch?v={vid}",
                        }
                    )
            for value in obj.values():
                walk(value)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(payload)
    return hits


def _innertube_text(node: Any) -> str:
    if not isinstance(node, dict):
        return ""
    runs = node.get("runs")
    if isinstance(runs, list) and runs:
        return str(runs[0].get("text", ""))
    return str(node.get("simpleText", ""))


async def search_youtube_innertube(
    client: httpx.AsyncClient, query: str, limit: int = 6
) -> list[dict[str, str]]:
    config = await fetch_innertube_config(client)
    if not config:
        return []
    api_key, client_version = config
    body = {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": client_version,
                "hl": "en",
                "gl": "US",
            }
        },
        "query": query,
    }
    res = await client.post(
        f"https://www.youtube.com/youtubei/v1/search?key={api_key}",
        json=body,
        headers={"User-Agent": BROWSER_UA, "Content-Type": "application/json"},
        timeout=15.0,
    )
    res.raise_for_status()
    return parse_innertube_videos(res.json())[:limit]


async def search_soundcloud(
    client: httpx.AsyncClient, query: str, limit: int = 6
) -> list[dict[str, str]]:
    cid = await fetch_soundcloud_client_id(client)
    if not cid:
        return []
    res = await client.get(
        "https://api-v2.soundcloud.com/search/tracks",
        params={"q": query, "client_id": cid, "limit": limit},
        headers={"User-Agent": BROWSER_UA},
        timeout=12.0,
    )
    if res.status_code == 401:
        global _SC_CID_CACHE
        _SC_CID_CACHE = None
        cid = await fetch_soundcloud_client_id(client)
        if not cid:
            return []
        res = await client.get(
            "https://api-v2.soundcloud.com/search/tracks",
            params={"q": query, "client_id": cid, "limit": limit},
            headers={"User-Agent": BROWSER_UA},
            timeout=12.0,
        )
    res.raise_for_status()
    hits: list[dict[str, str]] = []
    for item in res.json().get("collection", []):
        title = item.get("title", "")
        artist = item.get("user", {}).get("username", "")
        url = item.get("permalink_url", "")
        if title and url:
            hits.append({"title": title, "artist": artist, "url": url})
    return hits


async def search_itunes(
    client: httpx.AsyncClient, query: str, limit: int = 5
) -> list[dict[str, str]]:
    res = await client.get(
        "https://itunes.apple.com/search",
        params={"term": query, "entity": "song", "limit": limit},
        timeout=12.0,
    )
    res.raise_for_status()
    hits: list[dict[str, str]] = []
    for item in res.json().get("results", []):
        title = item.get("trackName", "")
        artist = item.get("artistName", "")
        url = item.get("trackViewUrl", "")
        if title and url:
            hits.append({"title": title, "artist": artist, "url": url})
    return hits


async def search_spotify_tracks(
    client: httpx.AsyncClient,
    query: str,
    limit: int = 5,
) -> list[dict[str, str]]:
    token = await spotify_token(client)
    if not token:
        return []
    res = await client.get(
        "https://api.spotify.com/v1/search",
        params={"q": query, "type": "track", "limit": limit},
        headers={"Authorization": f"Bearer {token}"},
        timeout=12.0,
    )
    res.raise_for_status()
    hits: list[dict[str, str]] = []
    for item in res.json().get("tracks", {}).get("items", []):
        title = item.get("name", "")
        artist = ", ".join(a["name"] for a in item.get("artists", []))
        url = item.get("external_urls", {}).get("spotify", "")
        track_id = item.get("id", "")
        if title and url:
            hits.append({"title": title, "artist": artist, "url": url, "spotify_id": track_id})
    return hits
