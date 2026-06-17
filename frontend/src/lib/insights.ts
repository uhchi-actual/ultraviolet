import { INSTRUMENT_LABELS, KEY_NAMES } from "./constants";
import type { IdentifierVector } from "./types";

export type InsightTone = "accent" | "positive" | "warning";

export interface Insight {
  label: string;
  detail: string;
  tone: InsightTone;
}

export interface TrackSummary {
  headline: string;
  mood: string;
  energyLabel: string;
  tempoLabel: string;
  keyLabel: string;
  insights: Insight[];
}

function moodWord(valence: number): string {
  if (valence < 0.3) return "Bleak";
  if (valence < 0.42) return "Melancholic";
  if (valence < 0.54) return "Bittersweet";
  if (valence < 0.66) return "Warm";
  if (valence < 0.8) return "Bright";
  return "Euphoric";
}

function energyWord(energy: number): string {
  if (energy < 0.35) return "Low-energy";
  if (energy < 0.55) return "Relaxed";
  if (energy < 0.72) return "Driving";
  return "High-energy";
}

function tempoWord(bpm: number): string {
  if (bpm < 70) return "Slow";
  if (bpm < 96) return "Laid-back";
  if (bpm < 116) return "Mid-tempo";
  if (bpm < 136) return "Upbeat";
  if (bpm < 168) return "Fast";
  return "Frenetic";
}

/** Dominant instruments, excluding the implied "vocals"/"noise" categories. */
function topInstruments(profile: Record<string, number>, count = 2): string[] {
  return Object.entries(profile)
    .filter(([key, value]) => value >= 0.25 && key !== "vocals" && key !== "noise_texture")
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => (INSTRUMENT_LABELS[key] ?? key).toLowerCase());
}

function arcCaption(arc: number[]): string | null {
  if (arc.length < 2) return null;
  const delta = arc[arc.length - 1] - arc[0];
  const peak = Math.max(...arc);
  const peakIdx = arc.indexOf(peak);
  if (delta > 0.18) return "Slow build — intensity climbs toward the end.";
  if (delta < -0.18) return "Front-loaded — it opens big, then eases off.";
  if (peakIdx > 0 && peakIdx < arc.length - 1 && peak - Math.min(...arc) > 0.18)
    return "Peaks in the middle, then resolves.";
  return null;
}

/**
 * Translate the raw 15-identifier vector into a handful of plain-English
 * conclusions a listener actually understands. Only thresholds that cross into
 * "interesting" territory produce an insight, so the output stays signal, not noise.
 */
export function summarize(v: IdentifierVector): TrackSummary {
  const insights: Insight[] = [];
  const dr = v.loudness_profile?.dynamic_range ?? 0;

  // Cross-identifier character (the most revealing conclusions).
  if (v.valence < 0.45 && v.danceability > 0.6) {
    insights.push({
      label: "Sad but danceable",
      detail: "A downbeat mood riding an upbeat groove — the melancholic-dancefloor sweet spot.",
      tone: "accent",
    });
  } else if (v.valence > 0.6 && v.energy > 0.6) {
    insights.push({
      label: "Bright and high-octane",
      detail: "Feel-good and energetic from front to back.",
      tone: "positive",
    });
  } else if (v.valence < 0.4 && v.energy > 0.6) {
    insights.push({
      label: "Brooding intensity",
      detail: "Dark in mood but high in energy — tense and propulsive.",
      tone: "accent",
    });
  }

  if (v.harmonic_darkness > 0.6)
    insights.push({
      label: "Dark harmony",
      detail: "Leans into minor tonality and low-end weight.",
      tone: "accent",
    });
  else if (v.harmonic_darkness < 0.28)
    insights.push({
      label: "Bright harmony",
      detail: "Major-key, consonant and open.",
      tone: "positive",
    });

  if (v.texture_density > 0.62)
    insights.push({
      label: "Wall of sound",
      detail: "Dense and layered — the spectrum is packed wall-to-wall.",
      tone: "accent",
    });
  else if (v.texture_density < 0.28)
    insights.push({
      label: "Sparse and spacious",
      detail: "A minimal arrangement with lots of air between elements.",
      tone: "positive",
    });

  if (dr > 11)
    insights.push({
      label: "Dynamic master",
      detail: `It breathes — about ${dr.toFixed(1)} dB between the quietest and loudest moments.`,
      tone: "positive",
    });
  else if (dr > 0 && dr < 7)
    insights.push({
      label: "Loud, compressed master",
      detail: `Brick-walled for loudness (~${dr.toFixed(1)} dB range) — little dynamic variation.`,
      tone: "warning",
    });

  if (v.production_aesthetic > 0.62)
    insights.push({
      label: "Polished, hi-fi",
      detail: "Crisp top end and a modern studio sheen.",
      tone: "positive",
    });
  else if (v.production_aesthetic < 0.32)
    insights.push({
      label: "Lo-fi / vintage",
      detail: "Rolled-off highs and analog warmth.",
      tone: "accent",
    });

  if (v.rhythmic_complexity > 0.62)
    insights.push({
      label: "Intricate groove",
      detail: "Syncopated, with shifting accents and subdivisions.",
      tone: "accent",
    });
  else if (v.rhythmic_complexity < 0.3)
    insights.push({
      label: "Hypnotic, steady pulse",
      detail: "A locked, repetitive rhythm you can lean into.",
      tone: "positive",
    });

  if (v.acousticness > 0.6)
    insights.push({
      label: "Acoustic-leaning",
      detail: "Organic, largely un-synthetic timbres.",
      tone: "positive",
    });
  else if (v.acousticness < 0.28)
    insights.push({
      label: "Electronic / produced",
      detail: "Synthetic and heavily processed timbres.",
      tone: "accent",
    });

  if (v.instrumentalness > 0.78) {
    insights.push({
      label: "Largely instrumental",
      detail: "Little to no lead vocal.",
      tone: "positive",
    });
  } else if (v.instrumentalness < 0.4) {
    const players = topInstruments(v.instrumentation_profile);
    insights.push({
      label: "Vocal-forward",
      detail: players.length
        ? `The voice sits up front, with ${players.join(" & ")} underneath.`
        : "The voice sits front and center.",
      tone: "accent",
    });
  }

  const arc = arcCaption(v.emotional_arc);
  if (arc)
    insights.push({ label: "Shifting intensity", detail: arc, tone: "positive" });

  // Vibe headline.
  const parts = [moodWord(v.valence).toLowerCase()];
  if (v.danceability > 0.6) parts.push("danceable");
  if (v.acousticness < 0.3) parts.push("electronic");
  else if (v.acousticness > 0.6) parts.push("acoustic");
  else if (v.texture_density > 0.62) parts.push("dense");
  else if (v.texture_density < 0.3) parts.push("sparse");
  if (parts.length < 3) {
    if (v.production_aesthetic > 0.62) parts.push("polished");
    else if (v.production_aesthetic < 0.32) parts.push("lo-fi");
  }

  return {
    headline: parts.slice(0, 3).join(" · "),
    mood: moodWord(v.valence),
    energyLabel: energyWord(v.energy),
    tempoLabel: tempoWord(v.tempo),
    keyLabel: `${KEY_NAMES[v.key] ?? "?"} ${v.mode === 1 ? "major" : "minor"}`,
    insights: insights.slice(0, 6),
  };
}
