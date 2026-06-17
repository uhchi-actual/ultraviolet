import { API_BASE_URL } from "./constants";
import type {
  AnalyzeResponse,
  ChatResponse,
  ChatTurn,
  HealthStatus,
  IngestDataType,
  IngestResponse,
  ProfileResponse,
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
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<AnalyzeResponse>;
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
