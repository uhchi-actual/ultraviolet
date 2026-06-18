import { API_BASE_URL } from "./constants";
import type {
  AnalyzeResponse,
  BatchAnalyzeEvent,
  CatalogTrack,
  ChatResponse,
  ChatTurn,
  HealthStatus,
  IngestDataType,
  IngestResponse,
  NicheSearchResponse,
  ProfileResponse,
  RadioResponse,
  SearchResult,
  TreeGraph,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/api/health");
}

export function sendChat(
  message: string,
  conversationHistory: ChatTurn[] = [],
): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversation_history: conversationHistory }),
  });
}

/** Upload an audio file for the DJ agent to fingerprint (multipart/form-data). */
export async function analyzeTrack(
  file: File,
  title?: string,
  artist?: string,
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  if (artist) form.append("artist", artist);

  // Let the browser set the multipart boundary; don't force a Content-Type.
  const res = await fetch(`${API_BASE_URL}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      const raw = body.detail ?? detail;
      detail = Array.isArray(raw)
        ? raw.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join("; ")
        : String(raw);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<AnalyzeResponse>;
}

export function searchTracks(
  query: string,
  referenceTrackId?: string,
  limit = 10,
): Promise<{ query: string; reference_track_id: string | null; results: SearchResult[] }> {
  return request("/api/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      reference_track_id: referenceTrackId ?? null,
      limit,
    }),
  });
}

export function cancelBatchAnalyze(): Promise<{ status: string }> {
  return request<{ status: string }>("/api/batch-analyze/cancel", { method: "POST" });
}

/** Stream batch analyze progress via SSE. */
export async function batchAnalyzeStream(
  body: {
    directory: string;
    recursive?: boolean;
    skip_existing?: boolean;
    purge_demo?: boolean;
  },
  onEvent: (event: BatchAnalyzeEvent) => void,
  signal?: AbortSignal,
): Promise<BatchAnalyzeEvent | null> {
  const res = await fetch(`${API_BASE_URL}/api/batch-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON */
    }
    throw new Error(`${res.status}: ${detail}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";
  let lastEvent: BatchAnalyzeEvent | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as BatchAnalyzeEvent;
          lastEvent = event;
          onEvent(event);
        } catch {
          /* malformed SSE chunk */
        }
      }
    }
  }
  return lastEvent;
}

export function nicheSearch(body: {
  track_id?: string;
  title?: string;
  artist?: string;
  identifiers: AnalyzeResponse["identifiers"];
}): Promise<NicheSearchResponse> {
  return request<NicheSearchResponse>("/api/niche-search", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Fetch the SOUL profile. Returns null when none has been built yet (404). */
export async function getProfile(): Promise<ProfileResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/profile`);
  if (res.status === 404) return null;
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<ProfileResponse>;
}

/** Upload personal listening data for SOUL to ingest (multipart/form-data). */
export async function ingestData(
  file: File,
  dataType: IngestDataType = "spotify_history",
): Promise<IngestResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("data_type", dataType);

  const res = await fetch(`${API_BASE_URL}/api/ingest`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<IngestResponse>;
}

export function getCatalog(): Promise<{ tracks: CatalogTrack[] }> {
  return request<{ tracks: CatalogTrack[] }>("/api/catalog");
}

export function postRadio(
  seedTrackId: string,
  count = 10,
  obscurityDial = 0.5,
): Promise<RadioResponse> {
  return request<RadioResponse>("/api/radio", {
    method: "POST",
    body: JSON.stringify({
      seed_track_id: seedTrackId,
      count,
      obscurity_dial: obscurityDial,
    }),
  });
}

export function getTreeFull(): Promise<TreeGraph> {
  return request<TreeGraph>("/api/tree/full");
}

export function buildManualTree(body: {
  songs: { title: string; artist?: string }[];
  recs_per_seed?: number;
  obscurity_dial?: number;
}): Promise<{ tree: TreeGraph }> {
  return request("/api/tree/build", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
