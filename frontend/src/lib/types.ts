/** Shared types mirroring the backend Pydantic/SQLModel schemas (PRD §9-10). */

export interface LoudnessProfile {
  peak_db: number;
  rms_db: number;
  dynamic_range: number;
  crest_factor: number;
}

export interface StemProfile {
  drums_presence: number;
  bass_presence: number;
  vocals_presence: number;
  other_presence: number;
  guitar_presence: number;
  piano_presence: number;
}

export interface EmotionalArc {
  values: number[];
  label: string;
}

export interface IdentifierVector {
  tempo: number;
  key: number;
  mode: number;
  energy: number;
  danceability: number;
  instrumentalness: number;
  loudness_profile: LoudnessProfile;
  texture_density: number;
  rhythmic_complexity: number;
  harmonic_darkness: number;
  stem_profile: StemProfile;
  emotional_arc: EmotionalArc;
}

export interface AnalyzeResponse {
  track_id: string;
  title: string;
  artist: string | null;
  identifiers: IdentifierVector;
  waveform_data: number[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  response: string;
  recommendations: Recommendation[];
}

export interface TreeChainItem {
  identifier: string;
  weight: number;
  source_track?: { id: string; title: string; artist: string };
  match_type?: string;
  play_count?: number;
  explanation: string;
}

export interface Recommendation {
  track_id: string;
  title: string;
  artist: string;
  confidence: number;
  identifiers?: Partial<IdentifierVector>;
  tree_chain?: TreeChainItem[];
}

export interface HealthStatus {
  status: "healthy" | "degraded";
  services: Record<string, string>;
}

export interface GenreWeight {
  genre: string;
  weight: number;
}

export interface TopArtist {
  artist: string;
  plays: number;
  hours: number;
  skip_rate: number;
}

export interface ProfileResponse {
  taste_vector: Record<string, number>;
  top_genres: GenreWeight[];
  top_artists: TopArtist[];
  listening_heatmap: number[][];
  taste_drift: Record<string, unknown>;
  total_tracks_analyzed: number;
  total_listening_hours: number;
  last_updated: string;
}

export type IngestDataType = "spotify_history" | "playlist_export" | "personal_text";

export interface IngestResponse {
  status: string;
  documents_processed: number;
  chunks_created: number;
  profile_updated: boolean;
}
