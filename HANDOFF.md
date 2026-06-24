# Ultraviolet — Development Handoff

**For Codex / next agent:** read **[`CODEX_HANDOFF.md`](CODEX_HANDOFF.md)** first — full PRD, correction ledger, $100 scoped plan, acceptance criteria.

**Last updated:** 2026-06-17  
**Owner:** uhchi-actual  
**Repo path:** `D:\projects\ultraviolet`  
**Runtime data:** `D:\ultraviolet-data\` (FMA zips, extracted mp3s, live catalog — not in git)

---

## Live demo (target)

| What | URL |
|------|-----|
| **Public static demo** | https://uhchi-actual.github.io/ultraviolet/ |
| **Tree (main feature)** | https://uhchi-actual.github.io/ultraviolet/tree/ |
| **Repo** | https://github.com/uhchi-actual/ultraviolet |

Same pattern as [Laniakea](https://uhchi-actual.github.io/laniakea/): static GitHub Pages, no server on the visitor's machine.

**Try it:** `New Order - Ceremony` on the Tree page → 80+ nodes, fully in-browser.

---

## What's done

### Public static demo (GitHub Pages)
- Next.js `output: "export"` → `frontend/out/`
- **7,994 FMA tracks** baked into `frontend/public/data/` (~16 MB embeddings + index)
- Client-side engine in `frontend/src/lib/static/` (catalog, seeds, scoring, tree)
- `buildManualTree()` and `searchTracks()` in `api.ts` call the static engine — no backend for Tree/Analyze search
- Chat / Radio / Profile show a static-demo notice
- CI: `.github/workflows/pages.yml` (build + deploy on push to `main`)

### Full local stack (backend)
- FMA pipeline complete on `D:\ultraviolet-data\`
- CLAP embeddings fixed (`pooler_output`, `audio=[array]`)
- `catalog_lookup.py` — text/prototype/neighbor seeds (no "upload on Analyze" error)
- Multi-driver scoring: CLAP + spectral + graph + MMR
- Backend default port **8001** via `UV_BACKEND_PORT` in `scripts/run-backend.mjs`

---

## What's not done (resume here)

| Priority | Task |
|----------|------|
| P1 | **Better text seeds** — prototype keys are sparse (`new order`, `the cure`, etc.). Ceremony works via prototype; add more artists or on-device CLAP text model for arbitrary queries |
| P2 | **Recommendation quality** — static tree branches into niche FMA tracks (Justice Yeldham, etc.) because FMA small is mostly obscure. Tune scoring thresholds in `frontend/src/lib/static/scoring.ts` |
| P3 | **Analyze upload in static build** — needs Web Audio + WASM or keep server-only |
| P4 | **Chat / Radio / Profile** — need backend + Ollama; or hide from nav in static-only deploy |
| P5 | **Docker full stack** — compose exists; verify with GPU for Demucs |
| P6 | **SOUL RAG** — Chroma ingest, profile synthesis |

---

## Key files

```
frontend/
  public/data/           # Static catalog (committed; LFS for .bin)
  src/lib/static/        # Client-side tree engine
  .env.production        # NEXT_PUBLIC_BASE_PATH=/ultraviolet
scripts/
  export_static_catalog.py   # Regenerate public/data from fma_clap.npz
  verify_static_demo.mjs     # Quick sanity check (no server)
backend/
  data/static/           # fma_clap.npz + fma_index.json for CI fallback
  src/recommendation/catalog_lookup.py
  src/scoring/clap_driver.py
```

---

## Commands

### Static demo (local, no backend)
```powershell
cd D:\projects\ultraviolet\frontend
npm run build
npx serve out -l 3999
# → http://localhost:3999/tree/
```

### Full stack (local dev)
```powershell
cd D:\projects\ultraviolet
npm run dev
# Backend :8001, frontend :3000 (see frontend/.env.local)
```

### Regenerate static catalog (after re-embedding FMA)
```powershell
$env:CATALOG_DIR = "D:\ultraviolet-data\catalog"
python D:\projects\ultraviolet\scripts\export_static_catalog.py
cd D:\projects\ultraviolet\frontend
npm run build
```

### Publish to GitHub Pages (one-time setup)

**If not logged in:**
```powershell
gh auth login
# Choose: GitHub.com → HTTPS → Login with browser
```

**Then publish:**
```powershell
cd D:\projects\ultraviolet
.\scripts\publish-github.ps1
```

This creates `uhchi-actual/ultraviolet`, pushes `main`, and triggers the Pages workflow.

**Enable Pages (first deploy only):**  
https://github.com/uhchi-actual/ultraviolet/settings/pages → **GitHub Actions**

**Verify:** https://uhchi-actual.github.io/ultraviolet/tree/ after CI finishes (~2 min).

---

## Git / deploy notes

- Branch: **`main`** (renamed from `master`)
- Large files: Git LFS for `frontend/public/data/*.bin` and `backend/data/static/*.npz`
- Pages workflow sets `NEXT_PUBLIC_BASE_PATH=/ultraviolet` — repo name must stay `ultraviolet` for URL to match
- First deploy: enable **Settings → Pages → Build and deployment → GitHub Actions**

---

## Known issues

1. **Stale backend on :8000** — old Python process may still serve pre-fix code; use :8001 or kill PID
2. **FMA small ≠ mainstream catalog** — New Order isn't in FMA; prototype/neighbor seeds cover demo queries
3. **`out/` is gitignored** — CI builds fresh; don't commit `frontend/out/`

---

## Resume checklist

- [ ] Open https://uhchi-actual.github.io/ultraviolet/tree/ — confirm Tree builds
- [ ] `git pull` on `main`
- [ ] Read this file + `ULTRAVIOLET_PRD.md` for phase goals
- [ ] Pick P1–P6 above based on whether you're shipping **demo** vs **full product**
