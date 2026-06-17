/** Shared types mirroring the backend Pydantic/SQLModel schemas (PRD §9-10). */

export interface LoudnessProfile {
  peak_db: number;
  rms_db: number;
  dynamic_range: number;
  crest_factor: number;
}

export interface VocalCharacter {
  pitch_range_low_hz: number | null;
  pitch_range_high_hz: number | null;
  pitch_median_hz: number | null;
  timbre_brightness: number | null;
  roughness: number | null;
  breathiness: number | null;
}

export type InstrumentationProfile = Record<string, number>;

export interface IdentifierVector {
  valence: number;
  energy: number;
  danceability: number;
  acousticness: number;
  tempo: number;
  key: number;
  mode: number;
  instrumentalness: number;
  loudness_profile: LoudnessProfile;
  texture_density: number;
  emotional_arc: number[];
  vocal_character: VocalCharacter | null;
  rhythmic_complexity: number;
  production_aesthetic: number;
  harmonic_darkness: number;
  instrumentation_profile: InstrumentationProfile;
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
