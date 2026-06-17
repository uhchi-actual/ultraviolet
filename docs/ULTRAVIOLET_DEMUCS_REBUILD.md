# ULTRAVIOLET — PRD Addendum: DJ Agent Rebuild (Demucs)

> Replaces: PRD Section 3.2 (DJ agent), Section 4 (Identifiers), Section 8.5 (Analyze page)
> Reason: The librosa frequency-band heuristic pipeline produces unreliable output.
> A Don Toliver instrumental was tagged "vocal-forward" with 69% vocal presence.
> Every identifier derived from spectral guessing is untrustworthy.
> This rebuild replaces guesswork with real ML source separation.

---

## What changes

The DJ agent's analysis pipeline is rebuilt around Meta's Demucs v4 (Hybrid Transformer Demucs),
a state-of-the-art music source separation model. Instead of guessing what instruments are present
from spectral shapes, Demucs physically separates the audio into stems and we measure each one.

**Source:** https://github.com/facebookresearch/demucs
**License:** MIT (free for commercial and personal use)
**Install:** `pip install -U demucs` (depends on PyTorch with CUDA)
**Paper:** Rouard, Massa, Défossez — "Hybrid Transformers for Music Source Separation" (ICASSP 2023)

## Demucs technical specification

### Models available

| Model | Stems | Quality (SDR) | Speed | Notes |
|-------|-------|---------------|-------|-------|
| `htdemucs` | 4 (drums, bass, other, vocals) | 9.00 dB | Fast | Default model. Source: github.com/facebookresearch/demucs |
| `htdemucs_ft` | 4 (drums, bass, other, vocals) | 9.20 dB | 4x slower | Fine-tuned, best quality. Source: github.com/facebookresearch/demucs |
| `htdemucs_6s` | 6 (drums, bass, other, vocals, guitar, piano) | Lower | Fast | Guitar separation okay, piano separation has artifacts. Source: github.com/facebookresearch/demucs |

**Use `htdemucs` as default** (fast, good quality). Offer `htdemucs_ft` as "high quality" option.
Do NOT use `htdemucs_6s` — the piano source has documented bleeding and artifacts (source: github.com/facebookresearch/demucs release notes).

### Hardware requirements

- GPU: NVIDIA with 4GB+ VRAM recommended (source: stemsplit.io/blog/demucs-local-setup-guide)
- RTX 5050 (8GB VRAM) is more than sufficient
- CPU fallback works but is 5-10x slower (source: stemsplit.io/blog/demucs-local-setup-guide)
- Input formats: MP3, WAV, FLAC, OGG, M4A — anything FFmpeg can decode (source: stemsplit.io/blog/demucs-local-setup-guide)

### VRAM management

Demucs and the LLM (JOSIEFIED-Qwen3:8b, ~5.5GB VRAM) cannot run simultaneously on 8GB VRAM.
The DJ agent MUST:
1. Unload the Ollama model before running Demucs (`POST http://ollama:11434/api/generate` with `keep_alive: 0`)
2. Run Demucs separation on GPU
3. After separation completes, reload the Ollama model on next LLM request (Ollama handles this automatically)

### Python API usage

Source: docs.clore.ai/guides/audio-and-voice/demucs-separation, github.com/facebookresearch/demucs

```python
from demucs.pretrained import get_model
from demucs.apply import apply_model
import torchaudio
import torch

# Load model
model = get_model('htdemucs')
model.cuda()
model.eval()

# Load audio
wav, sr = torchaudio.load("song.mp3")
wav = wav.cuda()

# Separate
with torch.no_grad():
    sources = apply_model(model, wav.unsqueeze(0), split=True)[0]

# sources shape: [4, channels, samples]
# Index 0: drums
# Index 1: bass
# Index 2: other (synths, guitars, keys, everything non-drums/bass/vocals)
# Index 3: vocals
```

---

## New DJ analysis pipeline

### Step 1: Demucs stem separation

Run the track through `htdemucs`. This produces 4 stems: drums, bass, other, vocals.
Cache separated stems on disk at `data/stems/{track_id}/` for reuse.

### Step 2: Stem energy measurement

For each separated stem, compute RMS energy as a percentage of total mix energy.
This gives REAL instrumentation presence values.

```python
import librosa
import numpy as np

def compute_stem_energy(stem_audio):
    """Compute RMS energy of a single stem."""
    rms = np.sqrt(np.mean(stem_audio ** 2))
    return rms

def compute_stem_percentages(stems_dict):
    """
    stems_dict: {'drums': audio_array, 'bass': audio_array, 'other': audio_array, 'vocals': audio_array}
    Returns: {'drums': 0-100, 'bass': 0-100, 'other': 0-100, 'vocals': 0-100}
    """
    energies = {name: compute_stem_energy(audio) for name, audio in stems_dict.items()}
    total = sum(energies.values())
    if total == 0:
        return {name: 0 for name in stems_dict}
    return {name: round((e / total) * 100) for name, e in energies.items()}
```

**Instrumentalness rule:** If vocals stem has less than 5% of total energy, `instrumentalness = 1.0`.
This would have correctly identified the Don Toliver instrumental.

### Step 3: Per-stem feature extraction

Run librosa on INDIVIDUAL stems, not the full mix. This is far more accurate because
you're analyzing isolated signals, not trying to untangle mixed frequencies.

- **Drums stem:** tempo (BPM), rhythmic complexity (onset detection on isolated drums)
- **Bass stem:** harmonic content, key estimation
- **Other stem:** spectral characteristics (synth vs acoustic textures)
- **Vocals stem (if present):** pitch range, timbre (only if vocals > 5% energy)
- **Full mix:** total energy (RMS), loudness profile, texture density

---

## Rebuilt identifier set

### KEPT — these are reliable

| # | Identifier | Source | Why it's reliable |
|---|-----------|--------|-------------------|
| 1 | **Tempo (BPM)** | librosa beat_track on drums stem | Isolated drums = cleaner beat detection |
| 2 | **Energy** | RMS of full mix | Always been reliable, simple physics |
| 3 | **Key + Mode** | Chroma features on bass + other stems | Isolated harmonics = cleaner key detection |
| 4 | **Danceability** | Beat strength/regularity from drums stem | Isolated drums = accurate groove measurement |
| 5 | **Instrumentalness** | Vocals stem energy ratio from Demucs | Binary and accurate: is the vocals stem silent or not |
| 6 | **Stem Presence** | RMS energy per Demucs stem | Real data: drums %, bass %, other %, vocals % |
| 7 | **Rhythmic Complexity** | Onset detection on drums stem | Isolated percussion = accurate syncopation measurement |
| 8 | **Texture Density** | Spectral bandwidth of full mix | Valid measure of sonic fullness |
| 9 | **Loudness Profile** | RMS, peak, dynamic range, crest factor of full mix | Always accurate, raw signal measurement |
| 10 | **Harmonic Darkness** | Minor key prevalence and dissonance from bass + other stems | Separated stems = cleaner harmonic analysis |
| 11 | **Emotional Arc** | Energy per quarter on full mix | ONLY display if variance across quarters > 15%. Otherwise label "Consistent throughout" |

### CUT — unreliable, deferred until we can do them right

| Identifier | Why it's cut | Revisit when |
|-----------|-------------|--------------|
| **Valence** | Too subjective for signal processing. No ground truth. | Train a classifier on user feedback (thumbs up/down on recommendations) |
| **Acousticness** | Demucs doesn't distinguish acoustic vs electric guitar. Guessing from spectral rolloff is unreliable. | Train a classifier or use a specialized model |
| **Production Aesthetic** | Lo-fi vs hi-fi detection from spectral rolloff is too crude. | Train a classifier on labeled production era data |
| **Vocal Character** | Requires clean vocal isolation. Defer until Demucs vocal stem quality is verified per-track. | After confirming Demucs vocal stem is artifact-free for a given track |
| **Instrumentation Profile (12-dim vector)** | The original 12-category vector (synth, electric_guitar, etc.) was fabricated from spectral templates. Demucs gives us 4 real stems, not 12 fake categories. | Replace with Demucs 4-stem energy percentages — real data, not guesses |

### New Stem Presence format (replaces Instrumentation Profile)

```json
{
  "drums_pct": 28,
  "bass_pct": 22,
  "other_pct": 45,
  "vocals_pct": 5,
  "instrumentalness": 0.95
}
```

This is honest. Every number is derived from real source separation.
If we can't measure it, we don't display it.

---

## Rebuilt Analyze page

Remove all unreliable visualizations. Only show what we can back up with real data.

### Layout (top to bottom):

1. **Track header:** Title, artist, duration, file format

2. **Stem breakdown bar chart:** Horizontal stacked bar showing drums %, bass %, other %, vocals %.
   Colors: drums = --uhchi-primary (red), bass = --uv-purple-bright, other = --uv-indigo, vocals = --uhchi-secondary (teal).
   This is the hero visualization — it's real data from Demucs.

3. **Reliable identifiers grid:** 2-column grid showing each kept identifier with:
   - Name (--font-mono)
   - Value (large, --font-display)
   - Visual bar (proportional to value, UV gradient fill)
   - One-line description of what the value means for THIS track

4. **Emotional arc chart:** 4-point line chart. ONLY shown if variance > 15%.
   If flat, show text: "Consistent intensity throughout" instead of a meaningless flat line.

5. **"Add to library" button:** Adds analyzed track to recommendation pool.

### REMOVED from Analyze page:

- "What Stands Out" LLM-generated tags (generated from broken data = broken tags)
- 15-axis radar chart (too many fake dimensions)
- Instrumentation Profile 12-category bar chart (fabricated categories)

### REPLACED with:

- Reduced radar chart with ONLY the 11 kept identifiers
- Demucs stem breakdown as the primary visualization
- Every displayed number traceable to either Demucs separation or librosa on isolated stems

---

## Docker disk safety (MUST BE ADDED)

The Docker configuration MUST include disk limits to prevent VHDX ballooning.

Add to the project setup instructions:

Create `C:\Users\<username>\.wslconfig`:
```ini
[wsl2]
diskSize=15GB
memory=8GB
swap=0
```

Source: blog.macleod.systems/reclaiming-disk-space-from-dockers-massive-vhdx-file-on-windows/

This caps the VHDX at 15GB and prevents it from consuming the entire drive.

---

## Updated backend dependencies

Add to `backend/pyproject.toml` or `requirements.txt`:

```
demucs>=4.0.0
torch>=2.0.0
torchaudio>=2.0.0
```

Remove reliance on `essentia` for instrument classification (it was producing unreliable results).
Keep `librosa` for tempo, chroma, RMS, onset detection — but run it on isolated stems from Demucs, not the full mix.

---

## Updated file structure changes

```
backend/src/analysis/
├── identifiers.py      # Master pipeline: Demucs separation → per-stem analysis → identifier computation
├── demucs_separator.py # NEW: Demucs model loading, GPU management, stem separation, caching
├── audio_features.py   # UPDATED: All extractors now take individual stems as input, not full mix
├── emotional_arc.py    # UPDATED: Variance threshold check before returning arc
├── instruments.py      # DELETED: Replaced by Demucs stem energy measurement
└── vocal_analysis.py   # DEFERRED: Only activated when Demucs vocal stem energy > 5%

data/stems/             # NEW: Cached Demucs stem outputs per track
└── {track_id}/
    ├── drums.wav
    ├── bass.wav
    ├── other.wav
    └── vocals.wav
```
