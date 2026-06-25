# Ultraviolet Codex Handoff

## Mission

Ultraviolet is a browser-based music discovery app and resume piece. The public
demo should open from GitHub, require no installation, and let a user turn a
playlist or pasted songs into a readable recommendation map plus a curated radio
sequence.

- Demo: https://uhchi-actual.github.io/ultraviolet/
- Tree: https://uhchi-actual.github.io/ultraviolet/tree/
- Repo: https://github.com/uhchi-actual/ultraviolet

## Current Product

The Tree route is the main experience. It combines:

- Song list input.
- Spotify playlist and liked songs import through browser PKCE.
- Local genre and motif analysis.
- Unique-seed playlist radio.
- Browser preview playback and tracklist export.
- Interactive genre-colored map with seed snapping.

The public app is a static Next.js export. The optional backend remains for
research and local experiments, but the public Tree route must not depend on it.

## Recent Direction

The product moved away from FMA catalog search as a user-facing workflow. FMA
assets may remain as static data, but the public UI should focus on the user's
own playlist, streaming search links, and curated discovery from the expanded
in-browser catalog.

Keep rendered maps small and legible. Large Spotify playlists should be scanned
for signal, then pruned before visualization.

Current import behavior:

- Scan up to 5,000 Spotify playlist tracks.
- Deduplicate by artist/title.
- Score for rarity across artist and inferred genre.
- Select 48 diverse seeds for the source list.
- Build a smaller map from those seeds.
- Preserve imported Spotify preview metadata when available.
- Browser preview playback uses Deezer first, Apple as fallback.

## Non-Negotiables

- Public demo works from GitHub Pages.
- `/tree/` builds without a backend.
- No static catalog status banners in the UI.
- No FMA catalog search UI.
- No duplicated source panels.
- No OAuth client secrets in the browser.
- No committed tokens, private playlist data, local paths, or personal email
  metadata.
- Run `npm --prefix frontend run build` before claiming done.
- Browser-test the Tree route after UI changes.

## Main Files

- `frontend/src/app/page.tsx` - home page
- `frontend/src/app/tree/` - Tree route
- `frontend/src/components/tree/StreamingSourcesPanel.tsx` - source input,
  Spotify, radio, export controls
- `frontend/src/components/tree/TreeCanvas.tsx` - graph viewport and seed
  selector
- `frontend/src/components/tree/GlowingThreads.tsx` - graph links
- `frontend/src/components/tree/organicLayout.ts` - layout, collision, genre
  zones
- `frontend/src/lib/static/streamingTree.ts` - static recommendation graph
- `frontend/src/lib/streaming.ts` - parsing, Spotify import, seed pruning
- `frontend/src/lib/playlistRadio.ts` - radio sequencing
- `frontend/src/lib/audioPreview.ts` - browser preview lookup

## Spotify Setup

The app uses Spotify Authorization Code with PKCE from the browser. Users paste
a Client ID, not a secret. The public demo may be configured with a bundled
Client ID; it is masked in the UI because browser Client IDs are public app
identifiers, not private credentials.

Redirect URI must match exactly:

```text
https://uhchi-actual.github.io/ultraviolet/tree/
```

For local development:

```text
http://127.0.0.1:3000/tree/
```

If Spotify shows `redirect_uri: Not matching configuration`, the configured URI
differs by host, port, path, protocol, or trailing slash.

## Verification Checklist

```powershell
npm --prefix frontend run build
npx serve frontend/out -l 3999
```

Open:

```text
http://127.0.0.1:3999/tree/
```

Check:

- Default source list builds a map.
- Graph has readable spacing and a low line count.
- One visible line renders per relationship.
- Seed selector snaps to seeds.
- Spotify import panel shows the exact redirect URI.
- Browser playlist can load/play previews.
- Import can auto-start Spotify auth and resume playlist/liked-songs scanning.
- Home page has no catalog count/status pill.

## Deployment

Push to `main`. GitHub Actions builds and deploys the static export to Pages.

After push, verify the latest run and open:

```text
https://uhchi-actual.github.io/ultraviolet/tree/
```
