"use client";

import { useEffect, useMemo, useState } from "react";

import { motifForGenre } from "@/lib/genreMotifs";
import { buildPlaylistRadio, radioToSeedText } from "@/lib/playlistRadio";
import {
  analyzeStreamingTracks,
  completeSpotifyLoginFromUrl,
  configuredSpotifyClientId,
  extractSpotifyPlaylistId,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyPlaylists,
  motifLegend,
  parseTrackLines,
  providerSearchUrl,
  spotifyAccessToken,
  spotifyRedirectUri,
  startSpotifyLogin,
  storeSpotifyClientId,
  tracksToSeedText,
  type DiscoveryTrack,
  type SpotifyPlaylist,
  type StreamingTrack,
} from "@/lib/streaming";
import {
  configuredYouTubeClientId,
  createYouTubeRadioPlaylist,
  preloadYouTubeIdentity,
  storeYouTubeClientId,
  type YouTubeExportResult,
} from "@/lib/youtube";

const STARTER_ROTATION =
  "New Order - Ceremony\nThe Cure - Plainsong\nMetallica - Nothing Else Matters\nFred again.. - Delilah\nBicep - Glue\nKurt Vile - Pretty Pimpin\nGrouper - Heavy Water/I'd Rather Be Sleeping\nMF DOOM - Doomsday\nFontaines D.C. - Starburster\nBig Thief - Simulation Swarm";

function linkRow(track: StreamingTrack | DiscoveryTrack) {
  return (
    <div className="mt-2 flex gap-1.5">
      {(["spotify", "youtube", "soundcloud"] as const).map((provider) => (
        <a
          key={provider}
          href={providerSearchUrl(track, provider)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-1 text-[11px] capitalize text-uv-text-secondary transition hover:border-uv-purple-bright hover:text-uv-text-primary"
        >
          {provider}
        </a>
      ))}
    </div>
  );
}

export function StreamingSourcesPanel({ onBuild }: { onBuild: (text: string) => void }) {
  const [pasteText, setPasteText] = useState(STARTER_ROTATION);
  const [clientId, setClientId] = useState("");
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [youtubeClientId, setYouTubeClientId] = useState("");
  const [youtubeTitle, setYouTubeTitle] = useState("Ultraviolet Unique-Seed Radio");
  const [youtubePrivacy, setYouTubePrivacy] = useState<"private" | "unlisted" | "public">("unlisted");
  const [youtubeLimit, setYouTubeLimit] = useState(24);
  const [youtubeStatus, setYouTubeStatus] = useState<string | null>(null);
  const [youtubeResult, setYouTubeResult] = useState<YouTubeExportResult | null>(null);
  const [youtubeLoading, setYouTubeLoading] = useState(false);

  useEffect(() => {
    const id = configuredSpotifyClientId();
    setClientId(id);
    setYouTubeClientId(configuredYouTubeClientId());
    setRedirectUri(spotifyRedirectUri());
    const finish = async () => {
      if (!id) return;
      try {
        const completed = await completeSpotifyLoginFromUrl(id);
        const access = spotifyAccessToken();
        setToken(access);
        if (completed && access) setStatus("Spotify connected");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Spotify auth failed");
      }
    };
    finish();
  }, []);

  const tracks = useMemo(() => parseTrackLines(pasteText), [pasteText]);
  const analysis = useMemo(() => analyzeStreamingTracks(tracks), [tracks]);
  const radio = useMemo(() => buildPlaylistRadio(tracks), [tracks]);
  const radioSeedText = useMemo(() => radioToSeedText(radio, 50), [radio]);

  async function connectSpotify() {
    if (!clientId.trim()) {
      setStatus("Add a Spotify Client ID. Browser PKCE does not use a Client Secret.");
      return;
    }
    storeSpotifyClientId(clientId);
    await startSpotifyLogin(clientId.trim());
  }

  async function copyRedirectUri() {
    if (!redirectUri) return;
    try {
      await navigator.clipboard.writeText(redirectUri);
      setStatus("Redirect URI copied. Add it to the Spotify app settings, save, then connect.");
    } catch {
      setStatus("Copy failed. Select the displayed redirect URI manually.");
    }
  }

  async function loadPlaylists() {
    const access = spotifyAccessToken();
    if (!access) {
      setStatus("Connect Spotify first");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const items = await fetchSpotifyPlaylists(access);
      setPlaylists(items.slice(0, 12));
      setToken(access);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load playlists");
    } finally {
      setLoading(false);
    }
  }

  async function loadPlaylist(id: string, accessToken = token) {
    if (!accessToken) return;
    setLoading(true);
    setStatus(null);
    try {
      const items = await fetchSpotifyPlaylistTracks(id, accessToken);
      const text = tracksToSeedText(items, 80);
      setPasteText(text);
      setStatus(`${items.length.toLocaleString()} Spotify tracks loaded`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load playlist");
    } finally {
      setLoading(false);
    }
  }

  async function importSpotifyPlaylistLink() {
    const access = spotifyAccessToken();
    if (!access) {
      setStatus("Connect Spotify first");
      return;
    }
    const playlistId = extractSpotifyPlaylistId(spotifyPlaylistUrl);
    if (!playlistId) {
      setStatus("Paste a Spotify playlist link or URI");
      return;
    }
    setToken(access);
    await loadPlaylist(playlistId, access);
  }

  async function createYouTubePlaylist() {
    if (!youtubeClientId.trim()) {
      setYouTubeStatus("Add a YouTube Client ID");
      return;
    }
    const exportTracks = radio.tracks.slice(0, youtubeLimit);
    if (!exportTracks.length) {
      setYouTubeStatus("Generate a radio sequence first");
      return;
    }
    storeYouTubeClientId(youtubeClientId);
    setYouTubeLoading(true);
    setYouTubeResult(null);
    setYouTubeStatus("Waiting for Google consent");
    try {
      const result = await createYouTubeRadioPlaylist({
        clientId: youtubeClientId.trim(),
        title: youtubeTitle.trim() || "Ultraviolet Unique-Seed Radio",
        privacyStatus: youtubePrivacy,
        tracks: exportTracks,
        onProgress: setYouTubeStatus,
      });
      setYouTubeResult(result);
      setYouTubeStatus(`Created ${result.inserted.length}/${exportTracks.length} YouTube tracks`);
    } catch (err) {
      setYouTubeStatus(err instanceof Error ? err.message : "YouTube export failed");
    } finally {
      setYouTubeLoading(false);
    }
  }

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-uv-border bg-uv-bg-surface/55 backdrop-blur-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-uv-text-primary">Source analysis</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {motifLegend().map((motif) => (
              <span
                key={motif.genre}
                className="rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ borderColor: motif.primary, color: motif.primary }}
              >
                {motif.genre} / {motif.mood}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-uv-text-muted">
            {tracks.length} track{tracks.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => onBuild(pasteText)}
            className="rounded-md border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-3 py-2 text-sm font-semibold text-uhchi-teal-bright transition hover:bg-uhchi-secondary/20"
          >
            Generate tree
          </button>
        </div>
      </header>

      <div className="grid gap-4 border-t border-uv-border/70 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={7}
            className="w-full rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-2 font-mono text-sm text-uv-text-primary"
            placeholder={"Artist - Title\nSpotify copied rows also work: Title\tArtist\tAlbum"}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-uv-text-muted">
            <span>Paste tracks, copied Spotify rows, or import a playlist link.</span>
            {analysis.slice(0, 6).map((group) => {
              const motif = motifForGenre(group.genre);
              return (
                <span
                  key={group.genre}
                  className="inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]"
                  style={{ borderColor: motif.primary, color: motif.primary }}
                >
                  {group.genre} {group.count}
                </span>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 lg:border-l lg:border-uv-border/70 lg:pl-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-uv-text-primary">Spotify import</h3>
            <span className="rounded-md border border-uv-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-uv-text-muted">
              PKCE
            </span>
          </div>
          {redirectUri ? (
            <div className="mt-2 rounded-md bg-uv-bg-primary/45 p-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-uv-text-muted">
                Redirect URI
              </p>
              <div className="mt-1 flex gap-2">
                <code className="min-w-0 flex-1 truncate text-[11px] text-uv-text-secondary">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={copyRedirectUri}
                  className="shrink-0 rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-1 text-[11px] text-uv-text-primary transition hover:border-uv-purple-bright"
                >
                  Copy
                </button>
              </div>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-uv-text-muted">
            Add that exact URI in Spotify. Any slash or host mismatch will fail.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Spotify Client ID"
              className="min-w-0 flex-1 rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-2 text-xs text-uv-text-primary placeholder:text-uv-text-muted"
            />
            <button
              type="button"
              onClick={connectSpotify}
              className="rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-xs text-uv-text-primary transition hover:border-uv-purple-bright"
            >
              Connect
            </button>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input
              value={spotifyPlaylistUrl}
              onChange={(e) => setSpotifyPlaylistUrl(e.target.value)}
              placeholder="Spotify playlist link"
              className="min-w-0 rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-2 text-xs text-uv-text-primary placeholder:text-uv-text-muted"
            />
            <button
              type="button"
              onClick={importSpotifyPlaylistLink}
              disabled={loading}
              className="rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-xs text-uv-text-primary transition hover:border-uv-purple-bright disabled:opacity-50"
            >
              Import
            </button>
          </div>
          <button
            type="button"
            onClick={loadPlaylists}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-xs text-uv-text-primary transition hover:border-uv-purple-bright disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Spotify playlists"}
          </button>
          {status ? <p className="mt-2 text-xs text-uv-text-secondary">{status}</p> : null}
          {playlists.length ? (
            <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => loadPlaylist(playlist.id)}
                  className="block w-full rounded-md bg-uv-bg-primary/45 px-3 py-2 text-left text-xs transition hover:bg-uv-bg-elevated"
                >
                  <span className="block truncate text-uv-text-primary">{playlist.name}</span>
                  <span className="text-uv-text-muted">{playlist.tracksTotal.toLocaleString()} tracks</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {analysis.length ? (
        <div className="border-t border-uv-border/70 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-sm font-semibold text-uv-text-primary">Recommendations</h3>
            <p className="text-xs text-uv-text-muted">Closest genre bridges from the current source list.</p>
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {analysis.slice(0, 6).map((group) => {
              const motif = motifForGenre(group.genre);
              return (
                <div key={group.genre} className="min-w-0">
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: motif.primary }}
                  >
                    {group.genre}
                  </p>
                  <div className="mt-2 space-y-3">
                    {group.recommendations.slice(0, 2).map((track) => (
                      <div
                        key={`${track.artist}-${track.title}`}
                        className="border-l pl-3"
                        style={{ borderColor: motif.primary }}
                      >
                        <p className="truncate text-sm font-medium text-uv-text-primary">
                          {track.title} <span className="text-uv-text-secondary">- {track.artist}</span>
                        </p>
                        <p className="text-xs text-uv-text-muted">{track.why}</p>
                        {linkRow(track)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {radio.tracks.length ? (
        <div className="grid gap-5 border-t border-uv-border/70 px-4 py-4 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-uv-text-primary">Radio seeds</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
              Unique plus familiar
            </p>
            <div className="mt-3 space-y-2">
              {radio.uniqueSeeds.slice(0, 5).map((track) => {
                const motif = motifForGenre(track.genre);
                return (
                  <div key={`${track.artist}-${track.title}`} className="min-w-0">
                    <p className="truncate text-sm font-medium text-uv-text-primary">{track.title}</p>
                    <p className="truncate text-xs text-uv-text-muted">{track.artist}</p>
                    <p
                      className="mt-1 inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                      style={{ borderColor: motif.primary, color: motif.primary }}
                    >
                      {track.genre} / {Math.round(track.uniqueness * 100)}
                    </p>
                  </div>
                );
              })}
            </div>
            {radio.familiarSeeds.length ? (
              <div className="mt-4 border-t border-uv-border/70 pt-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
                  Familiar anchors
                </p>
                <div className="mt-2 space-y-2">
                  {radio.familiarSeeds.map((track) => {
                    const motif = motifForGenre(track.genre);
                    return (
                      <div key={`${track.artist}-${track.title}`} className="min-w-0">
                        <p className="truncate text-sm font-medium text-uv-text-primary">{track.title}</p>
                        <p className="truncate text-xs text-uv-text-muted">{track.artist}</p>
                        <p
                          className="mt-1 inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                          style={{ borderColor: motif.primary, color: motif.primary }}
                        >
                          {track.genre} / familiar
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 xl:border-l xl:border-uv-border/70 xl:pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-uv-text-primary">Playlist radio</h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
                  Unique-seed sequence
                </p>
              </div>
              <button
                type="button"
                onClick={() => onBuild(radioSeedText)}
                className="rounded-md border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-3 py-2 text-xs font-semibold text-uhchi-teal-bright transition hover:bg-uhchi-secondary/20"
              >
                Build radio tree
              </button>
            </div>
            <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1 sm:grid-cols-2">
              {radio.tracks.slice(0, 16).map((track, index) => {
                const motif = motifForGenre(track.genre);
                return (
                  <div
                    key={`${track.role}-${track.artist}-${track.title}-${index}`}
                    className="rounded-lg bg-uv-bg-primary/45 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md border font-mono text-[10px]"
                        style={{ borderColor: motif.primary, color: motif.primary }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-uv-text-primary">{track.title}</p>
                        <p className="truncate text-xs text-uv-text-muted">{track.artist}</p>
                        <p className="mt-1 truncate text-[11px] capitalize text-uv-text-secondary">
                          {track.role}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 xl:border-l xl:border-uv-border/70 xl:pl-5">
            <h3 className="font-display text-sm font-semibold text-uv-text-primary">YouTube export</h3>
            <div className="mt-3 space-y-2">
              <input
                value={youtubeClientId}
                onChange={(e) => setYouTubeClientId(e.target.value)}
                onFocus={preloadYouTubeIdentity}
                placeholder="YouTube OAuth Client ID"
                className="w-full rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-2 text-xs text-uv-text-primary placeholder:text-uv-text-muted"
              />
              <input
                value={youtubeTitle}
                onChange={(e) => setYouTubeTitle(e.target.value)}
                className="w-full rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-2 text-xs text-uv-text-primary"
              />
              <div className="grid grid-cols-[1fr_84px] gap-2">
                <select
                  value={youtubePrivacy}
                  onChange={(e) => setYouTubePrivacy(e.target.value as "private" | "unlisted" | "public")}
                  className="rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-2 text-xs text-uv-text-primary"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
                <input
                  type="number"
                  min={8}
                  max={30}
                  value={youtubeLimit}
                  onChange={(e) => setYouTubeLimit(Math.min(30, Math.max(8, Number(e.target.value))))}
                  className="rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-2 text-xs text-uv-text-primary"
                />
              </div>
              <button
                type="button"
                onClick={createYouTubePlaylist}
                disabled={youtubeLoading}
                className="w-full rounded-md border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-3 py-2 text-xs font-semibold text-uhchi-teal-bright transition hover:bg-uhchi-secondary/20 disabled:opacity-50"
              >
                {youtubeLoading ? "Creating..." : "Create on YouTube"}
              </button>
              {youtubeStatus ? <p className="text-xs text-uv-text-secondary">{youtubeStatus}</p> : null}
              {youtubeResult ? (
                <a
                  href={youtubeResult.playlistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-xs text-uv-text-primary transition hover:border-uv-purple-bright"
                >
                  Open YouTube playlist
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
