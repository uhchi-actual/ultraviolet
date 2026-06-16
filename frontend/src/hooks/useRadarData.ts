export interface RadarDatum {
  identifier: string;
  value: number;
}

/**
 * Transform a track's identifier vector into Recharts radar data (one datum per
 * scalar identifier axis). Implemented in Phase 2.
 */
export function useRadarData(): RadarDatum[] {
  return [];
}
