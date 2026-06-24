"use client";

import { useEffect, useMemo, useState } from "react";

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
import { motifForGenre } from "@/lib/genreMotifs";

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

export function StreamingSourcesPanel({
  onUseSeeds,
  onBuild,
}: {
  onUseSeeds: (text: string) => void;
  onBuild: (text: string) => void;
}) {
  const [pasteText, setPasteText] = useState(STARTER_ROTATION);
  const [clientId, setClientId] = useState("");
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("");
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
  const mixedSeeds = useMemo(() => {
    const recs = analysis.flatMap((group) => group.recommendations).slice(0, 10);
    return tracksToSeedText([...tracks.slice(0, 14), ...recs], 24);
  }, [analysis, tracks]);

  async function connectSpotify() {
    if (!clientId.trim()) {
      setStatus("Add a Spotify Client ID");
      return;
    }
    storeSpotifyClientId(clientId);
    await startSpotifyLogin(clientId.trim());
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
      onUseSeeds(text);
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
    <section className="mb-5 rounded-xl border border-uv-border bg-uv-bg-surface/55 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onBuild(mixedSeeds)}
            className="rounded-md border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-3 py-2 text-sm font-semibold text-uhchi-teal-bright transition hover:bg-uhchi-secondary/20"
          >
            Generate mix
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={7}
            className="w-full rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-2 font-mono text-sm text-uv-text-primary"
            placeholder="Artist - Title"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {analysis.slice(0, 3).map((group) => (
              <div key={group.genre} className="rounded-lg border border-uv-border bg-uv-bg-primary/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
                  {group.genre} / {group.mood}
                </p>
                <p className="mt-1 text-2xl font-semibold text-uv-text-primary">{group.count}</p>
                <p className="mt-1 truncate text-xs text-uv-text-secondary">
                  {group.tracks.slice(0, 2).map((track) => track.artist).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-uv-border bg-uv-bg-primary/60 p-3">
          <div className="flex gap-2">
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
          <button
            type="button"
            onClick={loadPlaylists}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-xs text-uv-text-primary transition hover:border-uv-purple-bright disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Spotify playlists"}
          </button>
          <div className="mt-2 flex gap-2">
            <input
              value={spotifyPlaylistUrl}
              onChange={(e) => setSpotifyPlaylistUrl(e.target.value)}
              placeholder="Spotify playlist link"
              className="min-w-0 flex-1 rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-2 text-xs text-uv-text-primary placeholder:text-uv-text-muted"
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
          {status ? <p className="mt-2 text-xs text-uv-text-secondary">{status}</p> : null}
          {playlists.length ? (
            <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => loadPlaylist(playlist.id)}
                  className="block w-full rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-left text-xs transition hover:border-uv-purple-bright"
                >
                  <span className="block truncate text-uv-text-primary">{playlist.name}</span>
                  <span className="text-uv-text-muted">{playlist.tracksTotal.toLocaleString()} tracks</span>
                </button>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      {analysis.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {analysis.slice(0, 6).map((group) => (
            <div key={group.genre} className="rounded-lg border border-uv-border bg-uv-bg-primary/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
                {group.genre} recommendations
              </p>
              <div className="mt-2 space-y-3">
                {group.recommendations.slice(0, 2).map((track) => (
                  <div key={`${track.artist}-${track.title}`}>
                    <p className="truncate text-sm font-medium text-uv-text-primary">
                      {track.title} <span className="text-uv-text-secondary">- {track.artist}</span>
                    </p>
                    <p className="text-xs text-uv-text-muted">{track.why}</p>
                    {linkRow(track)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {radio.tracks.length ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <section className="rounded-lg border border-uv-border bg-uv-bg-primary/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-uv-text-primary">Playlist radio</h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
                  Unique-seed sequence
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onUseSeeds(radioSeedText)}
                  className="rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-xs text-uv-text-primary transition hover:border-uv-purple-bright"
                >
                  Use radio seeds
                </button>
                <button
                  type="button"
                  onClick={() => onBuild(radioSeedText)}
                  className="rounded-md border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-3 py-2 text-xs font-semibold text-uhchi-teal-bright transition hover:bg-uhchi-secondary/20"
                >
                  Build radio tree
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="rounded-lg border border-uv-border bg-uv-bg-elevated/70 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
                  Unique seeds
                </p>
                <div className="mt-2 space-y-2">
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
                  <div className="mt-4 border-t border-uv-border pt-3">
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

              <div className="grid max-h-72 gap-2 overflow-auto pr-1 sm:grid-cols-2">
                {radio.tracks.slice(0, 16).map((track, index) => {
                  const motif = motifForGenre(track.genre);
                  return (
                    <div
                      key={`${track.role}-${track.artist}-${track.title}-${index}`}
                      className="rounded-lg border border-uv-border bg-uv-bg-elevated/55 p-3"
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
          </section>

          <aside className="rounded-lg border border-uv-border bg-uv-bg-primary/60 p-3">
            <h3 className="font-display text-lg font-semibold text-uv-text-primary">YouTube export</h3>
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
          </aside>
        </div>
      ) : null}
    </section>
  );
}
