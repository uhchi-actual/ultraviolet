import type { StreamingTrack } from "./streaming";

export interface AudioPreview {
  trackKey: string;
  title: string;
  artist: string;
  album?: string;
  previewUrl: string;
  artworkUrl?: string;
  sourceUrl?: string;
}

interface ItunesTrack {
  artistName?: string;
  trackName?: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

interface ItunesSearchResponse {
  resultCount?: number;
  results?: ItunesTrack[];
}

const previewCache = new Map<string, Promise<AudioPreview | null>>();

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(feat|ft|featuring)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function previewTrackKey(track: Pick<StreamingTrack, "artist" | "title">): string {
  return `${normalize(track.artist)}::${normalize(track.title)}`;
}

function scoreCandidate(track: Pick<StreamingTrack, "artist" | "title">, candidate: ItunesTrack): number {
  if (!candidate.previewUrl) return -1;
  const targetTitle = normalize(track.title);
  const targetArtist = normalize(track.artist);
  const title = normalize(candidate.trackName ?? "");
  const artist = normalize(candidate.artistName ?? "");
  let score = 1;

  if (title === targetTitle) score += 7;
  else if (title.includes(targetTitle) || targetTitle.includes(title)) score += 4;

  if (artist === targetArtist) score += 7;
  else if (artist.includes(targetArtist) || targetArtist.includes(artist)) score += 4;

  if (candidate.collectionName) score += 0.5;
  return score;
}

function upgradedArtwork(url?: string): string | undefined {
  return url?.replace("100x100bb", "300x300bb");
}

function searchWithJsonp(url: string): Promise<ItunesSearchResponse> {
  if (typeof window === "undefined") return Promise.resolve({ resultCount: 0, results: [] });

  return new Promise((resolve, reject) => {
    const callbackName = `uvPreview${Date.now()}${Math.random().toString(36).slice(2)}`;
    const callbacks = window as unknown as Window & Record<string, (data: ItunesSearchResponse) => void>;
    const script = document.createElement("script");

    const cleanup = () => {
      delete callbacks[callbackName];
      script.remove();
      window.clearTimeout(timer);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Preview lookup timed out"));
    }, 9000);

    callbacks[callbackName] = (data: ItunesSearchResponse) => {
      cleanup();
      resolve(data);
    };

    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("Preview lookup failed"));
    };
    script.src = `${url}&callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

export async function searchAudioPreview(
  track: Pick<StreamingTrack, "artist" | "title">,
  country = "US",
): Promise<AudioPreview | null> {
  const key = previewTrackKey(track);
  const cached = previewCache.get(key);
  if (cached) return cached;

  const task = (async () => {
    const params = new URLSearchParams({
      term: `${track.artist} ${track.title}`,
      media: "music",
      entity: "song",
      limit: "8",
      country,
    });
    const data = await searchWithJsonp(`https://itunes.apple.com/search?${params.toString()}`);
    const best = [...(data.results ?? [])]
      .map((candidate) => ({ candidate, score: scoreCandidate(track, candidate) }))
      .filter((entry) => entry.score >= 5)
      .sort((a, b) => b.score - a.score)[0]?.candidate;

    if (!best?.previewUrl) return null;
    return {
      trackKey: key,
      title: best.trackName ?? track.title,
      artist: best.artistName ?? track.artist,
      album: best.collectionName,
      previewUrl: best.previewUrl,
      artworkUrl: upgradedArtwork(best.artworkUrl100),
      sourceUrl: best.trackViewUrl,
    };
  })();

  previewCache.set(key, task);
  return task;
}

export async function resolveAudioPreviews(
  tracks: Pick<StreamingTrack, "artist" | "title">[],
  limit = 20,
  onProgress?: (resolved: number, total: number, track: Pick<StreamingTrack, "artist" | "title">) => void,
): Promise<AudioPreview[]> {
  const uniqueTracks = tracks.filter((track, index, all) => {
    const key = previewTrackKey(track);
    return all.findIndex((candidate) => previewTrackKey(candidate) === key) === index;
  });
  const total = Math.min(limit, uniqueTracks.length);
  const previews: AudioPreview[] = [];

  for (const track of uniqueTracks) {
    if (previews.length >= limit) break;
    onProgress?.(previews.length, total, track);
    const preview = await searchAudioPreview(track).catch(() => null);
    if (preview) previews.push(preview);
  }

  return previews;
}
