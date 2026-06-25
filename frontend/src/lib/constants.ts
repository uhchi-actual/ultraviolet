import type { IdentifierVector, StemPresence } from "./types";

export const NAV_LINKS = [
  { href: "/tree", label: "Tree" },
] as const;

export type IdentifierCategory = "Sonic Foundation" | "Custom Niche";

export interface IdentifierMeta {
  id: number;
  key: string;
  name: string;
  range: string;
  category: IdentifierCategory;
}

/** The 15 audio identifiers (PRD §4 / Appendix A). */
export const IDENTIFIERS: IdentifierMeta[] = [
  { id: 1, key: "valence", name: "Valence", range: "0.0–1.0", category: "Sonic Foundation" },
  { id: 2, key: "energy", name: "Energy", range: "0.0–1.0", category: "Sonic Foundation" },
  { id: 3, key: "danceability", name: "Danceability", range: "0.0–1.0", category: "Sonic Foundation" },
  { id: 4, key: "acousticness", name: "Acousticness", range: "0.0–1.0", category: "Sonic Foundation" },
  { id: 5, key: "tempo", name: "Tempo", range: "BPM", category: "Sonic Foundation" },
  { id: 6, key: "key_mode", name: "Key + Mode", range: "0–11 + 0/1", category: "Sonic Foundation" },
  { id: 7, key: "instrumentalness", name: "Instrumentalness", range: "0.0–1.0", category: "Sonic Foundation" },
  { id: 8, key: "loudness_profile", name: "Loudness Profile", range: "multi", category: "Sonic Foundation" },
  { id: 9, key: "texture_density", name: "Texture Density", range: "0.0–1.0", category: "Custom Niche" },
  { id: 10, key: "emotional_arc", name: "Emotional Arc", range: "4-pt vector", category: "Custom Niche" },
  { id: 11, key: "vocal_character", name: "Vocal Character", range: "multi-dim", category: "Custom Niche" },
  { id: 12, key: "rhythmic_complexity", name: "Rhythmic Complexity", range: "0.0–1.0", category: "Custom Niche" },
  { id: 13, key: "production_aesthetic", name: "Production Aesthetic", range: "0.0–1.0", category: "Custom Niche" },
  { id: 14, key: "harmonic_darkness", name: "Harmonic Darkness", range: "0.0–1.0", category: "Custom Niche" },
  { id: 15, key: "instrumentation_profile", name: "Instrumentation Profile", range: "12-dim", category: "Custom Niche" },
];

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Demucs stacked bar segments (PRD addendum colors). */
export const STEM_SEGMENTS: {
  key: keyof StemPresence;
  label: string;
  color: string;
}[] = [
  { key: "drums_pct", label: "Drums", color: "var(--uhchi-primary)" },
  { key: "bass_pct", label: "Bass", color: "var(--uv-purple-bright)" },
  { key: "other_pct", label: "Other", color: "var(--uv-indigo)" },
  { key: "vocals_pct", label: "Vocals", color: "var(--uhchi-secondary)" },
];

/** 11 reliable identifiers for the reduced DJ radar. */
export const DJ_RADAR_AXES: { key: string; label: string; scale?: number }[] = [
  { key: "energy", label: "Energy" },
  { key: "danceability", label: "Groove" },
  { key: "instrumentalness", label: "Instrumental" },
  { key: "texture_density", label: "Density" },
  { key: "rhythmic_complexity", label: "Complexity" },
  { key: "harmonic_darkness", label: "Darkness" },
  { key: "stem_presence.drums_pct", label: "Drums", scale: 100 },
  { key: "stem_presence.bass_pct", label: "Bass", scale: 100 },
  { key: "stem_presence.other_pct", label: "Other", scale: 100 },
  { key: "stem_presence.vocals_pct", label: "Vocals", scale: 100 },
  { key: "tempo", label: "Tempo", scale: 200 },
];

/** Pitch-class names indexed 0-11. */
export const KEY_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

/** Scalar identifiers (0-1) plotted on the radar, with listener-friendly labels. */
export const RADAR_AXES: { key: string; label: string }[] = [
  { key: "valence", label: "Positivity" },
  { key: "energy", label: "Energy" },
  { key: "danceability", label: "Groove" },
  { key: "acousticness", label: "Acoustic" },
  { key: "instrumentalness", label: "Instrumental" },
  { key: "texture_density", label: "Density" },
  { key: "rhythmic_complexity", label: "Complexity" },
  { key: "production_aesthetic", label: "Hi-fi" },
  { key: "harmonic_darkness", label: "Darkness" },
];

/** SOUL taste-vector dimensions → listener-friendly labels (15-axis radar). */
export const TASTE_AXES: { key: string; label: string }[] = [
  { key: "valence_weight", label: "Positivity" },
  { key: "energy_weight", label: "Energy" },
  { key: "danceability_weight", label: "Groove" },
  { key: "acousticness_weight", label: "Acoustic" },
  { key: "tempo_weight", label: "Tempo" },
  { key: "key_mode_weight", label: "Tonality" },
  { key: "instrumentalness_weight", label: "Instrumental" },
  { key: "loudness_weight", label: "Dynamics" },
  { key: "texture_density_weight", label: "Density" },
  { key: "emotional_arc_weight", label: "Arc" },
  { key: "vocal_character_weight", label: "Vocals" },
  { key: "rhythmic_complexity_weight", label: "Complexity" },
  { key: "production_aesthetic_weight", label: "Hi-fi" },
  { key: "harmonic_darkness_weight", label: "Darkness" },
  { key: "instrumentation_weight", label: "Instruments" },
];

/** Day-of-week labels for the listening heatmap rows (Mon-first). */
export const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Human labels for the 12 instrumentation-profile categories (Identifier 15). */
export const INSTRUMENT_LABELS: Record<string, string> = {
  synth: "Synth",
  electric_guitar: "Electric guitar",
  acoustic_guitar: "Acoustic guitar",
  drums_electronic: "Drums (electronic)",
  drums_acoustic: "Drums (acoustic)",
  bass_synth: "Bass (synth)",
  bass_electric: "Bass (electric)",
  piano_keys: "Piano / keys",
  strings_orchestral: "Strings",
  brass_winds: "Brass / winds",
  vocals: "Vocals",
  noise_texture: "Noise / texture",
};

export const UV_GRADIENT_STOPS = ["#16007a", "#7a007a", "#7a0045"] as const;
