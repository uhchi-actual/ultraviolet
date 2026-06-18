import asyncio
import re

import httpx


async def main() -> None:
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
        r = await c.get("https://soundcloud.com", headers={"User-Agent": "Mozilla/5.0"})
        scripts = re.findall(r"https://[^\"']*sndcdn\.com[^\"']+\.js", r.text)
        print("scripts", len(scripts))
        cid = None
        patterns = [
            r'client_id="([A-Za-z0-9]+)"',
            r"client_id:'([A-Za-z0-9]+)'",
            r'clientId:"([A-Za-z0-9]+)"',
        ]
        for url in scripts[-8:]:
            js = await c.get(url, headers={"User-Agent": "Mozilla/5.0"})
            for pat in patterns:
                m = re.search(pat, js.text)
                if m:
                    cid = m.group(1)
                    print("found in", url[:60])
                    break
            if cid:
                break
        print("SC cid", cid)
        if not cid:
            m = re.search(r"client_id=([A-Za-z0-9]{16,32})", r.text)
            if m:
                cid = m.group(1)
                print("cid from html", cid)
        sc_page = await c.get(
            "https://soundcloud.com/search/sounds",
            params={"q": "Chris Stussy Darkness"},
            headers={"User-Agent": "Mozilla/5.0"},
        )
        m2 = re.search(r"client_id=([A-Za-z0-9]{16,32})", sc_page.text)
        print("sc search page cid", m2.group(1) if m2 else None)
        # iTunes
        it = await c.get(
            "https://itunes.apple.com/search",
            params={"term": "Chris Stussy Darkness", "entity": "song", "limit": 3},
        )
        print("iTunes", it.status_code, it.json().get("resultCount"))

        # Spotify — set SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET in .env
        tok = None
        if __import__("os").environ.get("SPOTIFY_CLIENT_ID"):
            tok = await c.post(
                "https://accounts.spotify.com/api/token",
                data={"grant_type": "client_credentials"},
                auth=(
                    __import__("os").environ["SPOTIFY_CLIENT_ID"],
                    __import__("os").environ.get("SPOTIFY_CLIENT_SECRET", ""),
                ),
            )
        print("spotify token", tok.status_code if tok else "skip")
        if tok.status_code == 200:
            token = tok.json()["access_token"]
            sr = await c.get(
                "https://api.spotify.com/v1/search",
                params={"q": "Chris Stussy Darkness", "type": "track", "limit": 3},
                headers={"Authorization": f"Bearer {token}"},
            )
            items = sr.json().get("tracks", {}).get("items", [])
            print("spotify hits", len(items), [i["name"] for i in items])

        # YouTube innertube
        yt = await c.get("https://www.youtube.com", headers={"User-Agent": "Mozilla/5.0"})
        key_m = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', yt.text)
        ver_m = re.search(r'"INNERTUBE_CLIENT_VERSION":"([^"]+)"', yt.text)
        print("innertube key", bool(key_m), bool(ver_m))
        if key_m:
            body = {
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": ver_m.group(1) if ver_m else "2.20250201.01.00",
                        "hl": "en",
                        "gl": "US",
                    }
                },
                "query": "Chris Stussy Darkness",
            }
            sr = await c.post(
                f"https://www.youtube.com/youtubei/v1/search?key={key_m.group(1)}",
                json=body,
                headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            )
            print("innertube", sr.status_code, sr.text[:400])
        for host in [
            "https://pipedapi.kavin.rocks",
            "https://pipedapi.adminforge.de",
            "https://api.piped.projectsegfau.lt",
            "https://vid.puffyan.us",
            "https://inv.nadeko.net",
            "https://yewtu.be",
        ]:
            try:
                if "invidious" in host or host.endswith(".be") or "nadeko" in host or "puffyan" in host:
                    pr = await c.get(f"{host}/api/v1/search", params={"q": "Chris Stussy Darkness", "type": "video"})
                    data = pr.json()
                    print(host, pr.status_code, len(data), data[0].get("title") if data else "")
                else:
                    pr = await c.get(f"{host}/search", params={"q": "Chris Stussy Darkness", "filter": "videos"})
                    items = pr.json().get("items", [])
                    print(host, pr.status_code, len(items), items[0].get("title") if items else "")
            except Exception as exc:
                print(host, "fail", exc)


if __name__ == "__main__":
    asyncio.run(main())
