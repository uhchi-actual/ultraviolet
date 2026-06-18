/** Shared types mirroring backend Pydantic schemas. */

export interface LoudnessProfile {
  peak_db: number;
  rms_db: number;
  dynamic_range: number;
  crest_factor: number;
}

export interface StemPresence {
  drums_pct: number;
  bass_pct: number;
  other_pct: number;
  vocals_pct: number;
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
  valence?: number;
  acousticness?: number;
  spectral_embedding?: number[];
  loudness_profile: LoudnessProfile;
  texture_density: number;
  rhythmic_complexity: number;
  harmonic_darkness: number;
  stem_presence: StemPresence;
  emotional_arc: EmotionalArc;
}

export interface AnalyzeResponse {
  track_id: string;
  title: string;
  artist: string | null;
  identifiers: IdentifierVector;
  waveform_data: number[];
}

export interface UltravioletGrade {
  score: number;
  confidence: number;
  agreement: string;
  drivers: {
    clap: number;
    stem: number;
    spectral: number;
    graph: number;
  };
}

export interface SearchResult {
  track_id: string;
  title: string;
  artist: string;
  genre_top?: string;
  source?: string;
  ultraviolet_grade?: UltravioletGrade;
}

export interface BatchAnalyzeEvent {
  status: string;
  total_files?: number;
  completed?: number;
  skipped?: number;
  current_file?: string;
  total_analyzed?: number;
  catalog_size?: number;
  duration_seconds?: number;
  removed?: number;
  embeddings_rebuilt?: number;
  errors?: { file: string; error: string }[];
  message?: string;
}

export interface NicheSearchHit {
  title: string;
  artist: string;
  url: string;
  source: "spotify" | "youtube" | "soundcloud" | "itunes" | "ultraviolet";
  query: string;
  match_reason: string;
  confidence: number;
  kind?: "identity" | "niche";
}

export interface NicheSearchSourceResult {
  source: string;
  status: "ok" | "empty" | "skipped";
  message?: string | null;
  hits: NicheSearchHit[];
}

export interface NicheSearchResponse {
  track_id: string | null;
  queries: string[];
  identity_queries?: string[];
  niche_queries?: string[];
  stem_hints: string[];
  sources: NicheSearchSourceResult[];
  identity_hits?: NicheSearchHit[];
  niche_hits?: NicheSearchHit[];
  top_hits: NicheSearchHit[];
  identity_guess?: { title: string; artist: string; source: string } | null;
  local_only?: boolean;
  elapsed_ms: number;
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
  recommendation_type?: "direct" | "bridge" | "discovery_quota";
  bridge_via?: { track_id: string; title: string; artist: string };
}

export interface RadioResponse {
  seed: {
    track_id: string;
    title: string;
    artist: string;
    play_count?: number;
    identifiers: IdentifierVector;
  };
  recommendations: Recommendation[];
  obscurity_dial: number;
  tree?: TreeGraph;
}

export interface TreeNode {
  id: string;
  title: string;
  artist: string;
  type: "seed" | "library" | "ai_recommendation";
  confidence?: number;
  plays?: number;
  genre_bucket?: string;
  why_summary?: string;
  why_details?: string[];
  recommendation_type?: string;
  identifiers?: Partial<IdentifierVector>;
}

export interface TreeEdge {
  source: string;
  target: string;
  weight: number;
  kind?: "trunk" | "root";
}

export interface TreeGraph {
  nodes: TreeNode[];
  edges: TreeEdge[];
  layout_seed?: number;
}

export interface CatalogTrack {
  track_id: string;
  title: string;
  artist: string;
  popularity_score: number;
  play_count: number;
  source: string;
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
