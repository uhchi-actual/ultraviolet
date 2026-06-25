# Ultraviolet

Browser-based music discovery and playlist radio.

**Live demo:** https://uhchi-actual.github.io/ultraviolet/

**Primary route:** https://uhchi-actual.github.io/ultraviolet/tree/

Ultraviolet turns a list of songs into an interactive recommendation map. It can
scan large Spotify playlists, prune them into diverse seed tracks, build a
genre-aware radio sequence, and play/export the generated mix in the browser.

## Features

- Interactive music web with genre-colored recommendation links.
- Playlist radio built from user seeds, close matches, bridge tracks, and a few
  recognizable anchors.
- Spotify playlist import through the official Web API authorization flow, with
  large playlists pruned into a readable seed set.
- In-browser preview player for generated mixes and selected map nodes.
- Tracklist copy/download for generated mixes.
- Streaming search links for Spotify, YouTube, and SoundCloud.

## Usage

Open the Tree and enter songs as:

```text
Artist - Title
```

To import a Spotify playlist:

1. Create an app in the Spotify Developer Dashboard.
2. Copy the app's Client ID into Ultraviolet. The app uses Spotify's browser
   PKCE flow.
3. Copy the redirect URI shown in Ultraviolet and add it to the Spotify app settings:
   - `https://uhchi-actual.github.io/ultraviolet/tree/` for the public demo
   - `http://127.0.0.1:3000/tree/` for local development
4. Paste a Spotify playlist link and import it.

Spotify requires an exact redirect URI match. `localhost`, a different port,
`/callback`, or a missing trailing slash will fail.

Playlist import scans up to 5,000 Spotify tracks and selects 48 diverse seeds
for the map. The tree stays intentionally smaller than the source playlist so it
remains readable and fast.

For the deployed demo, set a repository variable named `SPOTIFY_CLIENT_ID` before
the Pages build to prefill the Spotify Client ID field.

Generated radio mixes can be played as a browser preview queue, copied as an
ordered tracklist, or downloaded as a text file.

## Architecture

The public demo is a static Next.js export deployed to GitHub Pages.

The optional backend remains in the repository for local research workflows:
audio analysis, catalog scoring, embeddings, and API experiments. The public
Tree and Radio routes are built to run from static frontend assets.

## Local Development

Install dependencies:

```bash
npm run install:all
```

Run the frontend and optional backend helpers:

```bash
npm run dev
```

Build the static frontend:

```bash
cd frontend
npm run build
```

Run only the frontend:

```bash
cd frontend
npm run dev
```

Run the backend directly:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev,audio]"
uvicorn src.main:app --reload --port 8001
```

## Repository Map

- `frontend/src/app/tree/` - public recommendation map route
- `frontend/src/app/radio/` - playlist radio route
- `frontend/src/components/tree/` - map UI, animation, and source panels
- `frontend/src/components/radio/` - radio controls and recommendation cards
- `frontend/src/lib/static/` - static catalog, seeds, paths, and scoring
- `frontend/src/lib/streaming.ts` - playlist parsing and Spotify import
- `frontend/src/lib/playlistRadio.ts` - radio sequencing
- `frontend/src/lib/audioPreview.ts` - browser preview lookup
- `backend/src/` - optional local analysis and recommendation services

## Deployment

GitHub Pages serves the static frontend export. The repository sidebar points to
the public demo.
