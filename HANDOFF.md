# Ultraviolet Handoff

## Current Goal

Ship Ultraviolet as a polished browser demo for music discovery:

- Public app: https://uhchi-actual.github.io/ultraviolet/
- Primary route: https://uhchi-actual.github.io/ultraviolet/tree/
- Repo: https://github.com/uhchi-actual/ultraviolet

The public route is a static Next.js export. Visitors should be able to paste
songs, import a Spotify playlist with a Client ID, build a recommendation map,
and export a curated radio sequence to YouTube.

## Product State

- The Tree route is the resume-facing feature.
- Source analysis, Spotify import, playlist radio, YouTube export, and the map
  live in one consolidated panel on `/tree`.
- Spotify import uses browser PKCE and scans up to 5,000 playlist tracks.
- Imported playlists are pruned to 48 diverse seeds before the map is built.
- The map uses genre-colored regions, one visible line per relationship, seed
  snapping, and a low edge budget for performance.
- FMA/static catalog search is no longer part of the public UI.

## Key Files

- `frontend/src/app/tree/` - Tree route
- `frontend/src/components/tree/StreamingSourcesPanel.tsx` - source analysis,
  Spotify import, radio controls, YouTube export
- `frontend/src/components/tree/TreeCanvas.tsx` - map viewport, seed selector,
  node selection
- `frontend/src/components/tree/GlowingThreads.tsx` - relationship rendering
- `frontend/src/components/tree/organicLayout.ts` - map layout and collision
- `frontend/src/lib/static/streamingTree.ts` - browser-only recommendation tree
- `frontend/src/lib/streaming.ts` - parsing, genre inference, Spotify import
- `frontend/src/lib/playlistRadio.ts` - unique-seed radio sequencing
- `frontend/src/lib/youtube.ts` - YouTube playlist export

## Verification

Run before shipping:

```powershell
npm --prefix frontend run build
npx serve frontend/out -l 3999
```

Then open:

```text
http://127.0.0.1:3999/tree/
```

Check:

- Default tree builds.
- Map is readable at initial zoom.
- Seed selector snaps to a seed.
- Spotify redirect URI shown in the app matches the URI configured in Spotify.
- The home page no longer shows catalog/count status copy.

## Spotify Setup

Use the redirect URI displayed by the app. For the public deployment it should
be:

```text
https://uhchi-actual.github.io/ultraviolet/tree/
```

For local development it should be:

```text
http://127.0.0.1:3000/tree/
```

Spotify requires an exact match, including protocol, host, port, path, and
trailing slash.

## Notes

- Keep the public demo static and browser-first.
- Keep rendered trees intentionally smaller than source playlists.
- Avoid adding setup burden to the critical path.
- Do not commit local tokens, OAuth secrets, exported browser storage, or local
  playlist data.
