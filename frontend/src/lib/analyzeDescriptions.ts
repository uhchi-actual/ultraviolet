import type { IdentifierVector } from "./types";

export function describeIdentifier(
  key: string,
  vector: IdentifierVector,
): string {
  const sp = vector.stem_presence;
  switch (key) {
    case "tempo":
      return `Beat lands around ${Math.round(vector.tempo)} BPM from the isolated drums stem.`;
    case "energy":
      return vector.energy > 0.65
        ? "High overall loudness and motion in the full mix."
        : vector.energy < 0.35
          ? "Relatively quiet and restrained overall."
          : "Moderate energy across the full mix.";
    case "danceability":
      return vector.danceability > 0.6
        ? "Steady, danceable pulse in the drums stem."
        : "Looser or irregular groove in the drums.";
    case "instrumentalness":
      return vector.instrumentalness >= 0.95
        ? `Vocals stem is only ${sp.vocals_pct}% of energy — effectively instrumental.`
        : vector.instrumentalness < 0.3
          ? `Vocals stem carries ${sp.vocals_pct}% of the energy.`
          : `Mixed: vocals at ${sp.vocals_pct}% of stem energy.`;
    case "texture_density":
      return vector.texture_density > 0.6
        ? "Dense, wide spectrum in the full mix."
        : "Sparser spectral footprint.";
    case "rhythmic_complexity":
      return vector.rhythmic_complexity > 0.55
        ? "Syncopated or varied drum patterns."
        : "Straight, repetitive drum pattern.";
    case "harmonic_darkness":
      return vector.harmonic_darkness > 0.55
        ? "Minor-leaning harmony from bass + other stems."
        : "Brighter harmonic content from bass + other stems.";
    default:
      return "";
  }
}
