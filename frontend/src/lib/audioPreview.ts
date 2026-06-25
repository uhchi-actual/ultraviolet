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

interface DeezerTrack {
  title?: string;
  title_short?: string;
  link?: string;
  preview?: string;
  artist?: { name?: string };
  album?: { title?: string; cover_medium?: string };
}

interface DeezerSearchResponse {
  data?: DeezerTrack[];
}

interface PreviewCandidate {
  title?: string;
  artist?: string;
  album?: string;
  previewUrl?: string;
  artworkUrl?: string;
  sourceUrl?: string;
}

type PreviewTrack = Pick<StreamingTrack, "artist" | "title"> &
  Partial<Pick<StreamingTrack, "album" | "previewUrl" | "url">>;

const previewCache = new Map<string, Promise<AudioPreview | null>>();

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(feat|ft|featuring)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function primaryArtist(value: string): string {
  return compact(
    value
      .split(/\s+(?:feat\.?|ft\.?|featuring)\s+|,|;|\s+x\s+|\s+&\s+/i)[0] ??
        value,
  );
}

function simplifiedTitle(value: string): string {
  const cleaned = compact(
    value
      .replace(/\s+from\s+.+$/i, "")
      .replace(/\s*[\[(][^\])]*(?:feat|ft|featuring|remaster|live|demo|version|edit|from|soundtrack|ost|bonus)[^\])]*[\])]/gi, "")
      .replace(/\s+-\s*(?:remaster(?:ed)?|live|demo|version|edit|radio edit|bonus track).+$/i, ""),
  );
  return cleaned || value;
}

function comparisonTitles(track: PreviewTrack): string[] {
  return [...new Set([normalize(track.title), normalize(simplifiedTitle(track.title))].filter(Boolean))];
}

function comparisonArtists(track: PreviewTrack): string[] {
  return [...new Set([normalize(track.artist), normalize(primaryArtist(track.artist))].filter(Boolean))];
}

export function previewTrackKey(track: Pick<StreamingTrack, "artist" | "title">): string {
  return `${normalize(track.artist)}::${normalize(track.title)}`;
}

function scoreText(targets: string[], candidate: string): number {
  const value = normalize(candidate);
  if (!value) return 0;
  let best = 0;
  for (const target of targets) {
    if (!target) continue;
    if (value === target) best = Math.max(best, 7);
    else if (value.includes(target) || target.includes(value)) best = Math.max(best, 4);
    else if (target.split(" ").filter((part) => part.length > 2 && value.includes(part)).length >= 2) {
      best = Math.max(best, 2.5);
    }
  }
  return best;
}

function scoreCandidate(track: PreviewTrack, candidate: PreviewCandidate): number {
  if (!candidate.previewUrl) return -1;
  const titleScore = scoreText(comparisonTitles(track), candidate.title ?? "");
  const artistScore = scoreText(comparisonArtists(track), candidate.artist ?? "");
  let score = titleScore + artistScore;

  if (track.album && candidate.album && normalize(track.album) === normalize(candidate.album)) score += 1.5;
  if (candidate.album) score += 0.5;
  return score;
}

function upgradedArtwork(url?: string): string | undefined {
  return url?.replace("100x100bb", "300x300bb");
}

function searchWithJsonp<T>(url: string): Promise<T> {
  if (typeof window === "undefined") return Promise.resolve({} as T);

  return new Promise((resolve, reject) => {
    const callbackName = `uvPreview${Date.now()}${Math.random().toString(36).slice(2)}`;
    const callbacks = window as unknown as Window & Record<string, (data: T) => void>;
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

    callbacks[callbackName] = (data: T) => {
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

function bestCandidate(track: PreviewTrack, candidates: PreviewCandidate[]): PreviewCandidate | undefined {
  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(track, candidate) }))
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score)[0]?.candidate;
}

function searchTermsFor(track: PreviewTrack): string[] {
  return [
    `${primaryArtist(track.artist)} ${simplifiedTitle(track.title)}`,
    `${track.artist} ${track.title}`,
    `${simplifiedTitle(track.title)} ${primaryArtist(track.artist)}`,
  ].map(compact).filter(Boolean);
}

async function searchDeezerPreview(track: PreviewTrack): Promise<PreviewCandidate | undefined> {
  for (const term of [...new Set(searchTermsFor(track))]) {
    const params = new URLSearchParams({
      q: term,
      limit: "8",
      output: "jsonp",
    });
    const data = await searchWithJsonp<DeezerSearchResponse>(`https://api.deezer.com/search?${params.toString()}`);
    const best = bestCandidate(
      track,
      (data.data ?? []).map((candidate) => ({
        title: candidate.title_short ?? candidate.title,
        artist: candidate.artist?.name,
        album: candidate.album?.title,
        previewUrl: candidate.preview,
        artworkUrl: candidate.album?.cover_medium,
        sourceUrl: candidate.link,
      })),
    );
    if (best?.previewUrl) return best;
  }
  return undefined;
}

async function searchItunesPreview(track: PreviewTrack, country: string): Promise<PreviewCandidate | undefined> {
  for (const term of [...new Set(searchTermsFor(track))]) {
    const params = new URLSearchParams({
      term,
      media: "music",
      entity: "song",
      limit: "12",
      country,
    });
    const data = await searchWithJsonp<ItunesSearchResponse>(`https://itunes.apple.com/search?${params.toString()}`);
    const best = bestCandidate(
      track,
      (data.results ?? []).map((candidate) => ({
        title: candidate.trackName,
        artist: candidate.artistName,
        album: candidate.collectionName,
        previewUrl: candidate.previewUrl,
        artworkUrl: upgradedArtwork(candidate.artworkUrl100),
        sourceUrl: candidate.trackViewUrl,
      })),
    );
    if (best?.previewUrl) return best;
  }
  return undefined;
}

export async function searchAudioPreview(
  track: PreviewTrack,
  country = "US",
): Promise<AudioPreview | null> {
  const key = previewTrackKey(track);
  const cached = previewCache.get(key);
  if (cached) return cached;

  const task = (async () => {
    if (track.previewUrl) {
      return {
        trackKey: key,
        title: track.title,
        artist: track.artist,
        album: track.album,
        previewUrl: track.previewUrl,
        sourceUrl: track.url,
      };
    }

    const best = (await searchDeezerPreview(track).catch(() => undefined)) ??
      (await searchItunesPreview(track, country).catch(() => undefined));

    if (!best?.previewUrl) return null;
    return {
      trackKey: key,
      title: best.title ?? track.title,
      artist: best.artist ?? track.artist,
      album: best.album,
      previewUrl: best.previewUrl,
      artworkUrl: best.artworkUrl,
      sourceUrl: best.sourceUrl,
    };
  })();

  previewCache.set(key, task);
  return task;
}

export async function resolveAudioPreviews(
  tracks: PreviewTrack[],
  limit = 20,
  onProgress?: (resolved: number, total: number, track: PreviewTrack) => void,
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
