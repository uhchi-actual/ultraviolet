# Ultraviolet — Codex Handoff (PRD + Resume Deploy Spec)

**For:** OpenAI Codex (or any agent resuming this project)  
**Owner:** [uhchi-actual](https://github.com/uhchi-actual)  
**Budget guidance:** ~$100 API spend — stay surgical; do not re-scaffold  
**Last verified:** 2026-06-17 — Pages deploy green  

---

## 0. One-sentence mission

Ship a **public, browser-only music discovery demo** at `https://uhchi-actual.github.io/ultraviolet/` that a recruiter can click from GitHub **without installing anything**, where typing songs you already know branches into **new tracks you might actually play** — because the owner's personal rotation is getting stale.

This is a **central resume piece**, paired with [Laniakea](https://uhchi-actual.github.io/laniakea/). Match that polish: public repo, About sidebar with description + homepage link, click → works.

---

## 1. Non-negotiable requirements (read first)

### Public demo (GitHub Pages) — MUST

| Requirement | Detail |
|-------------|--------|
| **No server for visitors** | Demo runs 100% client-side. No `npm run dev`, no Python, no Docker for anyone clicking the link |
| **Public repo** | `github.com/uhchi-actual/ultraviolet`, default branch `main` |
| **Deploy like Laniakea** | GitHub Pages via Actions → `https://uhchi-actual.github.io/ultraviolet/` |
| **Repo About block** | Description + website URL visible in sidebar (see §8) |
| **Tree works offline** | User types `Artist - Title` → graph builds in-browser |
| **No upload gate** | Never show *"upload on Analyze first"* or *"not in your catalog"* for public demo |
| **Verifiable progress** | After changes: `npm run build` passes + manual browser test on Tree |

### Full local stack — OPTIONAL (not resume-facing)

Backend (FastAPI, CLAP, Demucs, Ollama, Chroma) lives in the repo + local runtime data. Resume visitors never touch this. Do not make resume demo depend on it.

---

## 2. Correction ledger (do not repeat these mistakes)

These are user corrections, corrections to corrections, and verified fixes. **Treat as hard constraints.**

### UX / product corrections

1. **"Anyone should type Artist - Title and build a tree"** — no account, no upload, no local catalog. Demo must work for strangers on GitHub Pages.
2. **"Deploy like Laniakea / github.io"** — static site only for public link. User was explicit that requiring localhost/backend wasted time.
3. **"Green banner but Tree 0% / disabled"** — status UI must reflect real client catalog load, not a fake-ready state.
4. **"'Ceremony' not in catalog — upload on Analyze"** — removed entirely. Seed resolution chain: FMA match → CLAP text prototype → neighbor blend → bucket centroid.
5. **"Faith-based status"** — always verify in browser after claiming done. Run `npm run build` and click Generate tree.
6. **Resume must be seamless** — one click from GitHub About → working app. No setup instructions on the critical path.

### Technical corrections

7. **FMA small ID filter `id <= 7999`** — wrong; FMA small uses scattered IDs up to ~155k. Fixed: scan all mp3s → 8000 indexed.
8. **CLAP transformers API** — use `audio=[array]` not deprecated `audios`; embedding from `pooler_output[0]` not wrong tensor shape.
9. **Stale backend on :8000** — old process served pre-fix `catalog_lookup.py`. New default port **8001** (`UV_BACKEND_PORT`). Not relevant to Pages demo but don't debug :8000 first.
10. **`publish-github.ps1` skipped repo create** — if `origin` exists but repo doesn't, script must `gh repo create` before push. Fixed.
11. **Pages CI export step failed** — tried re-export from npz without pydantic. Fixed: prefer committed `frontend/public/data/manifest.json` first.
12. **Duplicate `searchTracks` in api.ts** — broke build. Don't duplicate exports.
13. **`TreeNode.depth` / edge `kind: "branch"`** — types only allow `trunk \| root`. Fixed in static tree builder.

### Scope corrections

14. **Do not spend budget re-building Phase 1 scaffold** — it exists and builds.
15. **Do not commit `frontend/out/`** — CI builds it; gitignored.
16. **Do not commit secrets** — `.env.local` gitignored; production uses `.env.production` only.
17. **Large assets via Git LFS** — `frontend/public/data/fma-embeddings.bin` (~16 MB), `backend/data/static/fma_clap.npz`.

---

## 3. Current shipped state (baseline)

### Live URLs

| Resource | URL |
|----------|-----|
| **Demo home** | https://uhchi-actual.github.io/ultraviolet/ |
| **Tree (hero feature)** | https://uhchi-actual.github.io/ultraviolet/tree/ |
| **Repo** | https://github.com/uhchi-actual/ultraviolet |
| **Reference (Laniakea)** | https://uhchi-actual.github.io/laniakea/ |

### What works today (verified)

- **7,994 FMA tracks** loaded client-side from `frontend/public/data/`
- **Manual Tree** — default seed `New Order - Ceremony` → 80+ nodes, no API
- **Analyze search** — in-browser FMA text search
- **Static banner** — "7,994 FMA tracks in-browser. No server."
- **Health pill on home** — shows catalog count, not "API offline"
- **Chat / Radio / Profile** — `StaticUnavailable` notice (backend-only)

### What is weak (honest)

- **FMA small is mostly obscure/indie** — CLAP branches from "New Order" often land on niche artists (Justice Yeldham, etc.), not Post-punk peers. Technically works; **musically stale-adjacent**, not Spotify-quality discovery.
- **Only 4 text prototypes** baked: `new order`, `the cure`, `joy division`, `kurt vile`. Everything else uses neighbor blend or bucket centroid — weaker seeds.
- **No personal taste input in static demo** — can't ingest Spotify history without backend. Owner's rotation going stale is **not solved yet** in the public build.

---

## 4. Architecture (two modes)

```
┌─────────────────────────────────────────────────────────────┐
│  GITHUB PAGES (resume / public)                              │
│  Next.js static export → frontend/out/                       │
│  frontend/src/lib/static/{catalog,seeds,scoring,tree}.ts     │
│  Data: frontend/public/data/*.json + fma-embeddings.bin      │
│  NO FastAPI, NO Ollama, NO upload                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  LOCAL FULL STACK (development / future phases)              │
│  npm run dev → backend :8001 + frontend :3000                │
│  <local-data>\ — FMA zips, mp3s, live embeddings             │
│  backend/src/ — DJ, SOUL, Conductor, scoring, catalog_lookup   │
└─────────────────────────────────────────────────────────────┘
```

**Resume visitors use top box only.**

### Seed resolution (static) — `frontend/src/lib/static/seeds.ts`

```
resolveSeed(title, artist):
  1. resolveFmaSeed     — exact/substring match in 7994 tracks
  2. resolvePrototypeSeed — keys in seed-prototypes.json (4 artists)
  3. resolveNeighborSeed — blend top title matches OR bucket centroid
```

### Scoring — `frontend/src/lib/static/scoring.ts`

Multi-driver: CLAP dot (52%) + stem proxy (28%) + spectral (20%) + graph (15%), MMR diversity, depth-decayed min score. Tune here for better branches.

### API wiring — `frontend/src/lib/api.ts`

| Function | Static? |
|----------|---------|
| `buildManualTree` | ✅ `static/tree.ts` |
| `searchTracks` | ✅ `static/seeds.ts` |
| `analyzeTrack`, `sendChat`, `getProfile`, `postRadio` | ❌ backend only |

### Deploy config

| File | Purpose |
|------|---------|
| `frontend/next.config.ts` | `output: "export"`, `basePath` from env |
| `frontend/.env.production` | `NEXT_PUBLIC_BASE_PATH=/ultraviolet` |
| `frontend/.env.local` | `NEXT_PUBLIC_BASE_PATH=` (empty, local serve) |
| `frontend/src/lib/static/paths.ts` | `dataUrl()` → `/ultraviolet/data/...` on Pages |
| `.github/workflows/pages.yml` | Build + deploy on push to `main` |

---

## 5. Product spec (condensed PRD)

### Vision

Content-based music recommendation: analyze audio features, not play counts. Explainable Tree shows *why* each track was suggested. Three agents in full product:

- **DJ** — 15 audio identifiers + Demucs stems (backend)
- **SOUL** — taste profile from listening history RAG (backend)
- **Conductor** — orchestration + NL explanations (backend + Ollama)

**For resume demo, only Tree + search matter.**

### 15 identifiers (reference)

8 sonic foundation (valence, energy, danceability, …) + 7 custom niche (texture density, harmonic darkness, …). See `frontend/src/lib/constants.ts` → `IDENTIFIERS`.

### Tree UX (must keep)

- Textarea: one song per line, `Artist - Title`, up to 50 seeds
- Recs per seed slider (4–24)
- **Generate tree** → React Flow canvas, organic radial layout (`organicLayout.ts`)
- Default placeholder seeds should reflect **owner taste** (post-punk, electronic, indie) not random examples

### Analyze UX (static)

- FMA catalog search — works
- Upload — **disabled** in static build with clear copy pointing to Tree

### Pages to de-emphasize in static deploy (optional Codex task)

Hide or demote nav links for Chat / Radio / Profile if they only show "needs local stack" — reduces resume confusion. Tree + Analyze should be primary.

---

## 6. Scoped work plan (~$100 budget)

**Rule:** Each task ends with `npm run build` + browser check on `/tree/`. No task is done without verification.

### Phase A — Resume polish (do first, ~$15–25)

| # | Task | Done when |
|---|------|-----------|
| A1 | Set GitHub **About**: description + `https://uhchi-actual.github.io/ultraviolet/` | Sidebar matches Laniakea pattern |
| A2 | README opening: live link above fold, 1 screenshot or GIF of Tree | Recruiter understands in 10s |
| A3 | Home page CTA: **Build a Tree** primary; remove dead-end CTAs | Click path → Tree |
| A4 | Nav: Tree + Analyze only (or badge "local only" on others) | No confusing broken pages |
| A5 | Tree default textarea: 3–5 seeds reflecting owner taste (post-punk/electronic) | Demo feels personal |

### Phase B — Actually useful discovery (~$40–60)

**Goal:** Owner's music is stale → demo should surface **listenable adjacent tracks**, not random FMA noise.

| # | Task | Approach |
|---|------|----------|
| B1 | **Expand `seed-prototypes.json`** | Export CLAP text embeddings for 30–50 artists owner actually listens to (run `export_static_catalog.py` extension or one-off script). Priority: New Order, Depeche Mode, The Cure, Joy Division, Chris Stussy, Fred again.., etc. |
| B2 | **Tune `scoring.ts`** | Raise graph weight for same `genre_bucket`; add popularity proxy if available in fma-index; tighten MMR so branches stay coherent |
| B3 | **"My rotation" client-side panel** | Textarea: paste 10–20 `Artist - Title` lines → multi-seed tree in one click. **No backend.** Solves stale rotation for demo |
| B4 | **Result quality filter** | Optional: minimum spectral similarity floor so branches don't jump genres wildly |
| B5 | **Click node → preview** | If FMA track has no audio URL, show metadata + "search on YouTube/Spotify" link — makes output actionable |

### Phase C — Only if budget remains (~$15–25)

| # | Task | Notes |
|---|------|-------|
| C1 | Analyze search: show Ultraviolet grade drivers in static search results | Wire existing grade types |
| C2 | Spotify export ingest in static | **Defer** — needs backend or heavy WASM; not worth $100 |
| C3 | On-device CLAP text model | **Defer** — large; prototypes list is cheaper |

### Explicitly out of scope for $100

- Re-embedding full FMA catalog
- Docker/GPU Demucs in CI
- Ollama / Conductor chat on Pages
- Rewriting backend from scratch
- User accounts / auth

---

## 7. Acceptance criteria (definition of done)

### Resume / deploy

- [ ] `https://uhchi-actual.github.io/ultraviolet/tree/` loads catalog banner with track count
- [ ] `New Order - Ceremony` → Generate → 40+ nodes, no errors
- [ ] Works in incognito (no localhost, no extensions)
- [ ] GitHub About shows description + website link
- [ ] `npm run build` in `frontend/` exits 0
- [ ] Push to `main` → Pages workflow green

### Usefulness (owner sign-off)

- [ ] Pasting 5 songs owner actually plays → tree suggests tracks in **recognizably related** genres (not random noise compilations)
- [ ] At least one branch feels like "I would queue this" — subjective but required

---

## 8. GitHub repo presentation (copy-paste)

### About → Description

```
Multi-agent music recommendation engine with explainable Tree — content-based discovery over 8K tracks, runs entirely in your browser.
```

### About → Website

```
https://uhchi-actual.github.io/ultraviolet/
```

### Topics (suggested)

`music-recommendation` `nextjs` `typescript` `clap` `github-pages` `content-based-filtering` `data-visualization`

### Comparison to Laniakea

| Laniakea | Ultraviolet |
|----------|-------------|
| `uhchi-actual.github.io/laniakea/` | `uhchi-actual.github.io/ultraviolet/` |
| Single `index.html` | Next.js static export |
| GPU particle sim | CLAP + spectral tree |
| About: title + link | **Match this pattern** |

---

## 9. File map (where to edit)

```
<repo>\                                  # Git root
├── CODEX_HANDOFF.md                       # This file
├── HANDOFF.md                             # Short ops handoff
├── README.md                              # Repo front door
├── scripts/
│   ├── export_static_catalog.py           # Regenerate public/data from npz
│   ├── verify_static_demo.mjs             # Offline catalog sanity check
│   └── publish-github.ps1                 # gh repo create + push
├── .github/workflows/pages.yml            # Pages CI
├── frontend/
│   ├── public/data/                       # Baked catalog (LFS .bin)
│   ├── src/lib/static/                    # ★ Client engine
│   ├── src/components/tree/               # Tree UI + canvas
│   ├── src/app/tree/page.tsx              # Tree route
│   └── .env.production                    # basePath=/ultraviolet
└── backend/                               # Local stack only
    └── src/recommendation/catalog_lookup.py  # Reference for seed logic
```

**Runtime data (not in git):** `<local-data>\fma\`, `<local-data>\catalog\`

---

## 10. Commands cheat sheet

```powershell
# Verify static build
cd <repo>\frontend
npm run build
npx serve out -l 3999
# → http://localhost:3999/tree/

# Offline data check
node <repo>\scripts\verify_static_demo.mjs

# Regenerate catalog assets (needs numpy, local npz)
$env:CATALOG_DIR = "<local-data>\catalog"
python <repo>\scripts\export_static_catalog.py

# Publish
cd <repo>
gh auth login   # if needed
.\scripts\publish-github.ps1

# Full local stack (dev only)
npm run dev     # backend :8001, frontend :3000
```

---

## 11. Known bugs / landmines

| Issue | Mitigation |
|-------|------------|
| Pages 404 on assets | `NEXT_PUBLIC_BASE_PATH` must match repo name `/ultraviolet` |
| LFS files missing in CI | `checkout@v4` with `lfs: true` (already set) |
| Catalog load fails on Pages | Check browser Network tab for `/ultraviolet/data/manifest.json` |
| Tree empty after generate | `loadCatalog()` failed — check console |
| Backend tests fail without GPU | Ignore for Pages work |
| `API_BASE_URL` defaults to :8000 | Static paths must not call backend for Tree |

---

## 12. Codex session prompt (paste to start)

```
You are resuming Ultraviolet for uhchi-actual. Read CODEX_HANDOFF.md in repo root first.

Constraints:
- Public demo MUST work at https://uhchi-actual.github.io/ultraviolet/tree/ with NO backend.
- Budget ~$100: surgical edits only, no re-scaffold.
- Verify every claim: npm run build + browser test on Tree.
- Goal: resume piece that actually helps discover new music (owner's rotation is stale).

Start with Phase A (resume polish), then Phase B (useful discovery).
Repo path: <repo>
Do not require npm run dev or localhost for the public demo.
```

---

## 13. Owner context (why this matters)

- **Resume:** Ultraviolet sits beside Laniakea as a technical portfolio piece — multi-agent architecture, ML embeddings, interactive viz, shipped to GitHub Pages.
- **Personal need:** Music rotation is getting stale. The demo is only successful if typing what you already play surfaces something you'd **actually listen to next**, not a technical curiosity graph.
- **Tone:** User values verified progress over optimistic status. Show working URLs and node counts, not promises.

---

*End of handoff. Ship Phase A+B, verify in browser, push to `main`, confirm Pages green.*
