export const NAV_LINKS = [
  { href: "/radio", label: "Radio" },
  { href: "/tree", label: "Tree" },
  { href: "/profile", label: "Profile" },
  { href: "/analyze", label: "Analyze" },
  { href: "/chat", label: "Chat" },
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

/** Pitch-class names indexed 0-11 (Identifier 6, key). */
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
