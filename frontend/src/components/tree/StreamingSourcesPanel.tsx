"use client";

import { useEffect, useMemo, useState } from "react";

import {
  analyzeStreamingTracks,
  completeSpotifyLoginFromUrl,
  configuredSpotifyClientId,
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
  const [token, setToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const id = configuredSpotifyClientId();
    setClientId(id);
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

  async function loadPlaylist(id: string) {
    if (!token) return;
    setLoading(true);
    setStatus(null);
    try {
      const items = await fetchSpotifyPlaylistTracks(id, token);
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
            onClick={() => onUseSeeds(tracksToSeedText(tracks, 50))}
            className="rounded-md border border-uv-border bg-uv-bg-elevated px-3 py-2 text-sm text-uv-text-primary transition hover:border-uv-purple-bright"
          >
            Use as seeds
          </button>
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
    </section>
  );
}
