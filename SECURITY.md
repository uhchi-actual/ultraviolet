# Security

## Before publishing to GitHub

1. **Never commit `.env`** — it is listed in `.gitignore`. Copy from `.env.example` and fill in locally.
2. **Rotate any credentials shared in chat or screenshots** — especially Spotify Client ID/Secret.
3. **Do not commit** `D:/ultraviolet-data/` or any catalog with personal listening history.

## Environment variables (secrets)

| Variable | Required | Notes |
|----------|----------|-------|
| `SPOTIFY_CLIENT_ID` | For NicheSearch / manual tree | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | For NicheSearch / manual tree | Keep local only |
| `SOUNDCLOUD_CLIENT_ID` | Optional | Auto-fetched if omitted |
| `DATABASE_URL` | Profile/SOUL only | Analyze/Radio/Tree work without Postgres |

## What ships in the repo

- `.env.example` — placeholders only, no real keys
- `backend/data/demo_catalog.json` — fictional demo tracks, no user data
- No API keys in source code or tests

## Reporting issues

If you find a leaked secret in git history, rotate the key immediately and open a private security issue.
