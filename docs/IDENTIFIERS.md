# The 15 Audio Identifiers

> Status: Phase 1 stub. Extraction implemented in Phase 2.

| # | Name | Range | Category |
|---|------|-------|----------|
| 1 | Valence | 0.0–1.0 | Sonic Foundation |
| 2 | Energy | 0.0–1.0 | Sonic Foundation |
| 3 | Danceability | 0.0–1.0 | Sonic Foundation |
| 4 | Acousticness | 0.0–1.0 | Sonic Foundation |
| 5 | Tempo | BPM float | Sonic Foundation |
| 6 | Key + Mode | 0–11 + 0/1 | Sonic Foundation |
| 7 | Instrumentalness | 0.0–1.0 | Sonic Foundation |
| 8 | Loudness Profile | Multi-value | Sonic Foundation |
| 9 | Texture Density | 0.0–1.0 | Custom Niche |
| 10 | Emotional Arc | 4-point vector | Custom Niche |
| 11 | Vocal Character | Multi-dim vector | Custom Niche |
| 12 | Rhythmic Complexity | 0.0–1.0 | Custom Niche |
| 13 | Production Aesthetic | 0.0–1.0 | Custom Niche |
| 14 | Harmonic Darkness | 0.0–1.0 | Custom Niche |
| 15 | Instrumentation Profile | 12-dim vector | Custom Niche |

Each identifier's derivation is documented in the PRD §4. Extraction functions
live in `backend/src/analysis/`.
