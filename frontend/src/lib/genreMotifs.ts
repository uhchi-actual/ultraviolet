export interface GenreMotif {
  genre: string;
  mood: string;
  primary: string;
  secondary: string;
  dim: string;
  glow: string;
}

const MOTIFS: GenreMotif[] = [
  {
    genre: "Rock",
    mood: "angry",
    primary: "#ef4444",
    secondary: "#f97316",
    dim: "rgba(239, 68, 68, 0.2)",
    glow: "rgba(239, 68, 68, 0.46)",
  },
  {
    genre: "Experimental",
    mood: "volatile",
    primary: "#f43f5e",
    secondary: "#a855f7",
    dim: "rgba(244, 63, 94, 0.18)",
    glow: "rgba(244, 63, 94, 0.4)",
  },
  {
    genre: "Instrumental",
    mood: "sad",
    primary: "#38bdf8",
    secondary: "#6366f1",
    dim: "rgba(56, 189, 248, 0.16)",
    glow: "rgba(56, 189, 248, 0.38)",
  },
  {
    genre: "Folk",
    mood: "tender",
    primary: "#60a5fa",
    secondary: "#14b8a6",
    dim: "rgba(96, 165, 250, 0.16)",
    glow: "rgba(96, 165, 250, 0.35)",
  },
  {
    genre: "Electronic",
    mood: "kinetic",
    primary: "#22d3ee",
    secondary: "#a855f7",
    dim: "rgba(34, 211, 238, 0.17)",
    glow: "rgba(34, 211, 238, 0.4)",
  },
  {
    genre: "Pop",
    mood: "bright",
    primary: "#f472b6",
    secondary: "#facc15",
    dim: "rgba(244, 114, 182, 0.16)",
    glow: "rgba(244, 114, 182, 0.36)",
  },
  {
    genre: "Hip-Hop",
    mood: "percussive",
    primary: "#f59e0b",
    secondary: "#ef4444",
    dim: "rgba(245, 158, 11, 0.18)",
    glow: "rgba(245, 158, 11, 0.42)",
  },
  {
    genre: "International",
    mood: "earth",
    primary: "#34d399",
    secondary: "#f59e0b",
    dim: "rgba(52, 211, 153, 0.16)",
    glow: "rgba(52, 211, 153, 0.34)",
  },
];

const DEFAULT_MOTIF: GenreMotif = {
  genre: "Discovery",
  mood: "mixed",
  primary: "#a855f7",
  secondary: "#22d3ee",
  dim: "rgba(168, 85, 247, 0.17)",
  glow: "rgba(168, 85, 247, 0.34)",
};

export function motifForGenre(genre?: string | null): GenreMotif {
  if (!genre) return DEFAULT_MOTIF;
  const normalized = genre.toLowerCase();
  return (
    MOTIFS.find(
      (motif) =>
        motif.genre.toLowerCase() === normalized ||
        normalized.includes(motif.genre.toLowerCase()),
    ) ?? DEFAULT_MOTIF
  );
}

export function allGenreMotifs(): GenreMotif[] {
  return MOTIFS;
}
