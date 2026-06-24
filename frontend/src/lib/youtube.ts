import type { RadioTrack } from "./playlistRadio";

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const YOUTUBE_CLIENT_ID_KEY = "ultraviolet_youtube_client_id";

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export interface YouTubeExportResult {
  playlistId: string;
  playlistUrl: string;
  inserted: { track: RadioTrack; videoId: string; title?: string }[];
  missed: { track: RadioTrack; reason: string }[];
}

function queryFor(track: Pick<RadioTrack, "artist" | "title">): string {
  return `${track.artist} ${track.title} official audio`;
}

function youtubeApiUrl(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `https://www.googleapis.com/youtube/v3/${path}?${search.toString()}`;
}

async function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity script failed to load")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Google Identity script failed to load"));
    document.head.appendChild(script);
  });
}

export function preloadYouTubeIdentity(): void {
  void loadGoogleIdentityScript().catch(() => {
    /* Export click reports load/auth failures to the user. */
  });
}

export function configuredYouTubeClientId(): string {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  return localStorage.getItem(YOUTUBE_CLIENT_ID_KEY) || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}

export function storeYouTubeClientId(clientId: string): void {
  localStorage.setItem(YOUTUBE_CLIENT_ID_KEY, clientId.trim());
}

export async function requestYouTubeAccessToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript();
  return new Promise((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: YOUTUBE_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error("No YouTube access token returned"));
          return;
        }
        resolve(response.access_token);
      },
    });
    if (!tokenClient) {
      reject(new Error("Google Identity Services is unavailable"));
      return;
    }
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

async function youtubeFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`YouTube ${response.status}: ${detail}`);
  }
  return response.json() as Promise<T>;
}

export async function searchYouTubeVideo(
  track: Pick<RadioTrack, "artist" | "title">,
  token: string,
): Promise<{ videoId: string; title?: string } | null> {
  const data = await youtubeFetch<{
    items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
  }>(
    youtubeApiUrl("search", {
      part: "snippet",
      type: "video",
      maxResults: "1",
      q: queryFor(track),
      videoCategoryId: "10",
    }),
    token,
  );
  const first = data.items?.find((item) => item.id?.videoId);
  return first?.id?.videoId ? { videoId: first.id.videoId, title: first.snippet?.title } : null;
}

async function createYouTubePlaylist(
  token: string,
  title: string,
  description: string,
  privacyStatus: "private" | "unlisted" | "public",
): Promise<{ id: string }> {
  return youtubeFetch<{ id: string }>(
    youtubeApiUrl("playlists", { part: "snippet,status" }),
    token,
    {
      method: "POST",
      body: JSON.stringify({
        snippet: { title, description },
        status: { privacyStatus },
      }),
    },
  );
}

async function insertPlaylistItem(token: string, playlistId: string, videoId: string): Promise<void> {
  await youtubeFetch(
    youtubeApiUrl("playlistItems", { part: "snippet" }),
    token,
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: {
            kind: "youtube#video",
            videoId,
          },
        },
      }),
    },
  );
}

export async function createYouTubeRadioPlaylist({
  clientId,
  title,
  privacyStatus,
  tracks,
  onProgress,
}: {
  clientId: string;
  title: string;
  privacyStatus: "private" | "unlisted" | "public";
  tracks: RadioTrack[];
  onProgress?: (message: string) => void;
}): Promise<YouTubeExportResult> {
  const token = await requestYouTubeAccessToken(clientId);
  const description = "Built by Ultraviolet from a unique-seed playlist radio sequence.";
  onProgress?.("Creating YouTube playlist");
  const playlist = await createYouTubePlaylist(token, title, description, privacyStatus);
  const inserted: YouTubeExportResult["inserted"] = [];
  const missed: YouTubeExportResult["missed"] = [];

  for (const [index, track] of tracks.entries()) {
    onProgress?.(`Resolving ${index + 1}/${tracks.length}: ${track.artist} - ${track.title}`);
    try {
      const match = await searchYouTubeVideo(track, token);
      if (!match) {
        missed.push({ track, reason: "No YouTube video match" });
        continue;
      }
      await insertPlaylistItem(token, playlist.id, match.videoId);
      inserted.push({ track, videoId: match.videoId, title: match.title });
    } catch (err) {
      missed.push({ track, reason: err instanceof Error ? err.message : "YouTube insert failed" });
    }
  }

  return {
    playlistId: playlist.id,
    playlistUrl: `https://www.youtube.com/playlist?list=${playlist.id}`,
    inserted,
    missed,
  };
}
