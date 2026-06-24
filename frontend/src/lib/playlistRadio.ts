import {
  DISCOVERY_CATALOG,
  FAMILIAR_LANDMARKS,
  exactFamiliarLandmark,
  inferStreamingGenre,
  type DiscoveryTrack,
  type StreamingTrack,
} from "./streaming";

export interface RadioTrack extends StreamingTrack {
  genre: string;
  role:
    | "playlist seed"
    | "unique seed"
    | "familiar seed"
    | "genre discovery"
    | "bridge discovery"
    | "wildcard discovery";
  why: string;
  uniqueness: number;
}

export interface PlaylistRadio {
  tracks: RadioTrack[];
  uniqueSeeds: RadioTrack[];
  familiarSeeds: RadioTrack[];
  genreCounts: { genre: string; count: number }[];
  title: string;
}

const BRIDGES: Record<string, string[]> = {
  Rock: ["Experimental", "Electronic", "Pop"],
  Experimental: ["Rock", "Electronic", "Instrumental", "Hip-Hop"],
  Instrumental: ["Electronic", "Folk", "Experimental"],
  Folk: ["Pop", "Instrumental", "International"],
  Electronic: ["Experimental", "Pop", "Instrumental", "Hip-Hop"],
  Pop: ["Electronic", "Folk", "Rock"],
  "Hip-Hop": ["Electronic", "Experimental", "Pop"],
  International: ["Folk", "Electronic", "Experimental"],
};

const UNIQUE_GENRE_BONUS: Record<string, number> = {
  Experimental: 0.18,
  International: 0.16,
  Instrumental: 0.13,
  "Hip-Hop": 0.08,
  Electronic: 0.06,
  Folk: 0.05,
  Rock: 0.03,
  Pop: 0,
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function key(track: Pick<StreamingTrack, "artist" | "title">): string {
  return `${clean(track.artist).toLowerCase()}::${clean(track.title).toLowerCase()}`;
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizedJitter(value: string): number {
  return (hash(value) % 1000) / 1000;
}

function dedupeTracks(tracks: StreamingTrack[]): StreamingTrack[] {
  const seen = new Set<string>();
  const output: StreamingTrack[] = [];
  for (const track of tracks) {
    const cleanTrack = {
      ...track,
      artist: clean(track.artist),
      title: clean(track.title),
    };
    if (!cleanTrack.artist || !cleanTrack.title) continue;
    const trackKey = key(cleanTrack);
    if (seen.has(trackKey)) continue;
    seen.add(trackKey);
    output.push(cleanTrack);
  }
  return output;
}

function scorePlaylistTrack(
  track: StreamingTrack,
  genres: Map<string, number>,
  artists: Map<string, number>,
  total: number,
): RadioTrack {
  const genre = inferStreamingGenre(track);
  const genreShare = (genres.get(genre) ?? 1) / Math.max(total, 1);
  const artistShare = (artists.get(track.artist.toLowerCase()) ?? 1) / Math.max(total, 1);
  const rareGenre = 1 - genreShare;
  const oneOffArtist = 1 - artistShare;
  const lexicalOddity = Math.min(0.16, `${track.artist} ${track.title}`.split(/\s+/).length / 80);
  const jitter = normalizedJitter(key(track)) * 0.07;
  const score =
    rareGenre * 0.42 +
    oneOffArtist * 0.24 +
    (UNIQUE_GENRE_BONUS[genre] ?? 0.04) +
    lexicalOddity +
    jitter;

  return {
    ...track,
    genre,
    role: "playlist seed",
    why: "Source playlist anchor.",
    uniqueness: Math.round(Math.min(1, score) * 1000) / 1000,
  };
}

function rankedCatalog(pool: DiscoveryTrack[], basis: string): DiscoveryTrack[] {
  const salt = hash(basis);
  return [...pool].sort((a, b) => ((hash(key(a)) ^ salt) >>> 0) - ((hash(key(b)) ^ salt) >>> 0));
}

function takeCatalogTrack(
  pool: DiscoveryTrack[],
  used: Set<string>,
  basis: string,
): DiscoveryTrack | null {
  return rankedCatalog(pool, basis).find((track) => !used.has(key(track))) ?? null;
}

function asRadioTrack(track: DiscoveryTrack, role: RadioTrack["role"], basis: string): RadioTrack {
  return {
    artist: track.artist,
    title: track.title,
    genre: track.genre,
    source: track.source,
    role,
    why: track.why,
    uniqueness: Math.round((0.52 + (UNIQUE_GENRE_BONUS[track.genre] ?? 0.04) + normalizedJitter(basis) * 0.18) * 1000) / 1000,
  };
}

function asFamiliarSourceSeed(track: RadioTrack): RadioTrack {
  return {
    ...track,
    role: "familiar seed",
    why: "Recognizable source seed for orientation in the radio.",
    uniqueness: Math.round(Math.max(0.48, track.uniqueness - 0.08) * 1000) / 1000,
  };
}

function takeFamiliarLandmark(
  genre: string,
  used: Set<string>,
  basis: string,
): DiscoveryTrack | null {
  const bridgeGenres = BRIDGES[genre] ?? [];
  const pool = FAMILIAR_LANDMARKS.filter((track) => track.genre === genre || bridgeGenres.includes(track.genre));
  return takeCatalogTrack(pool, used, `${basis}|familiar landmark`);
}

function genreCountsFor(tracks: RadioTrack[]): { genre: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const track of tracks) counts.set(track.genre, (counts.get(track.genre) ?? 0) + 1);
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

export function buildPlaylistRadio(
  input: StreamingTrack[],
  options: { targetLength?: number; uniqueSeedCount?: number } = {},
): PlaylistRadio {
  const sourceTracks = dedupeTracks(input);
  const total = sourceTracks.length;
  const targetLength = Math.min(Math.max(options.targetLength ?? 32, 12), 50);
  const uniqueSeedCount = Math.min(Math.max(options.uniqueSeedCount ?? 5, 3), 8);

  const genreCounts = new Map<string, number>();
  const artistCounts = new Map<string, number>();
  for (const track of sourceTracks) {
    genreCounts.set(inferStreamingGenre(track), (genreCounts.get(inferStreamingGenre(track)) ?? 0) + 1);
    artistCounts.set(track.artist.toLowerCase(), (artistCounts.get(track.artist.toLowerCase()) ?? 0) + 1);
  }

  const scoredSeeds = sourceTracks
    .map((track) => scorePlaylistTrack(track, genreCounts, artistCounts, total))
    .sort((a, b) => b.uniqueness - a.uniqueness || key(a).localeCompare(key(b)));
  const uniqueSeeds = scoredSeeds.slice(0, Math.min(uniqueSeedCount, scoredSeeds.length)).map((track) => ({
    ...track,
    role: "unique seed" as const,
    why: `Unique source seed: ${track.genre.toLowerCase()} is a smaller lane in this playlist.`,
  }));
  const familiarSeeds = scoredSeeds
    .filter((track) => exactFamiliarLandmark(track))
    .slice(0, 2)
    .map(asFamiliarSourceSeed);

  const used = new Set<string>(sourceTracks.map(key));
  const output: RadioTrack[] = [];
  const familiarBudget = Math.min(3, Math.max(1, Math.floor(targetLength / 12)));
  let familiarCount = 0;
  const dominantGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([genre]) => genre);
  const opening = scoredSeeds
    .filter((track) => !uniqueSeeds.some((seed) => key(seed) === key(track)))
    .slice(0, Math.min(3, scoredSeeds.length));

  for (const track of opening) output.push(track);
  for (const seed of familiarSeeds) {
    if (!output.some((track) => key(track) === key(seed))) output.push(seed);
  }

  let uniqueIndex = 0;
  let guard = 0;
  while (output.length < targetLength && guard < targetLength * 3) {
    const genre = dominantGenres[guard % Math.max(dominantGenres.length, 1)] ?? "Pop";
    const bridgeGenres = BRIDGES[genre] ?? [];
    const pools: { role: RadioTrack["role"]; tracks: DiscoveryTrack[] }[] = [
      { role: "genre discovery", tracks: DISCOVERY_CATALOG.filter((track) => track.genre === genre) },
      { role: "bridge discovery", tracks: DISCOVERY_CATALOG.filter((track) => bridgeGenres.includes(track.genre)) },
      {
        role: "wildcard discovery",
        tracks: DISCOVERY_CATALOG.filter((track) => track.genre !== genre && !bridgeGenres.includes(track.genre)),
      },
    ];

    for (const pool of pools) {
      if (output.length >= targetLength) break;
      const picked = takeCatalogTrack(pool.tracks, used, `${genre}|${pool.role}|${guard}|${sourceTracks.length}`);
      if (!picked) continue;
      used.add(key(picked));
      output.push(asRadioTrack(picked, pool.role, `${genre}|${pool.role}|${guard}`));
    }

    if (familiarCount < familiarBudget && output.length >= 7 && output.length < targetLength && guard % 3 === 1) {
      const familiar = takeFamiliarLandmark(genre, used, `${genre}|${guard}|${sourceTracks.length}`);
      if (familiar) {
        used.add(key(familiar));
        output.push(asRadioTrack(familiar, "familiar seed", `${genre}|familiar|${guard}`));
        familiarCount += 1;
      }
    }

    if (uniqueSeeds.length && output.length >= Math.floor(targetLength * 0.45) && output.length < targetLength) {
      const seed = uniqueSeeds[uniqueIndex % uniqueSeeds.length]!;
      if (!output.some((track) => key(track) === key(seed))) output.push(seed);
      uniqueIndex += 1;
    }
    guard += 1;
  }

  for (const seed of uniqueSeeds) {
    if (output.length >= targetLength) break;
    if (!output.some((track) => key(track) === key(seed))) output.push(seed);
  }

  return {
    tracks: output.slice(0, targetLength),
    uniqueSeeds,
    familiarSeeds,
    genreCounts: genreCountsFor(output),
    title: "Ultraviolet Unique-Seed Radio",
  };
}

export function radioToSeedText(radio: PlaylistRadio, limit = 50): string {
  return radio.tracks
    .slice(0, limit)
    .map((track) => `${track.artist} - ${track.title}`)
    .join("\n");
}
