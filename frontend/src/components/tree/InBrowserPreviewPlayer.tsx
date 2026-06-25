"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type AudioPreview,
  previewTrackKey,
  resolveAudioPreviews,
} from "@/lib/audioPreview";
import type { StreamingTrack } from "@/lib/streaming";

interface InBrowserPreviewPlayerProps {
  tracks: Pick<StreamingTrack, "artist" | "title">[];
  title?: string;
  compact?: boolean;
}

export function InBrowserPreviewPlayer({
  tracks,
  title = "Browser playlist",
  compact = false,
}: InBrowserPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previews, setPreviews] = useState<AudioPreview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const queue = useMemo(
    () =>
      tracks.filter((track, index, all) => {
        if (!track.artist.trim() || !track.title.trim()) return false;
        const key = previewTrackKey(track);
        return all.findIndex((candidate) => previewTrackKey(candidate) === key) === index;
      }),
    [tracks],
  );
  const queueKey = useMemo(() => queue.map(previewTrackKey).join("|"), [queue]);
  const current = previews[currentIndex] ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setPreviews([]);
    setCurrentIndex(0);
    setPlaying(false);
    setStatus(null);
  }, [queueKey]);

  async function loadPreviews(): Promise<AudioPreview[]> {
    if (previews.length) return previews;
    if (!queue.length) {
      setStatus("No tracks queued");
      return [];
    }

    setLoading(true);
    setStatus("Finding previews");
    try {
      const loaded = await resolveAudioPreviews(queue, compact ? 1 : 20, (resolved, total, track) => {
        setStatus(`${resolved}/${total} resolved - ${track.title}`);
      });
      setPreviews(loaded);
      setCurrentIndex(0);
      setStatus(loaded.length ? `${loaded.length} previews ready` : "No previews found");
      return loaded;
    } finally {
      setLoading(false);
    }
  }

  async function playIndex(index: number, source = previews) {
    const preview = source[index];
    const audio = audioRef.current;
    if (!preview || !audio) return;

    setCurrentIndex(index);
    audio.src = preview.previewUrl;
    audio.load();
    try {
      await audio.play();
      setPlaying(true);
      setStatus(`${preview.title} - ${preview.artist}`);
    } catch {
      setPlaying(false);
      setStatus("Preview ready");
    }
  }

  async function playOrPause() {
    const audio = audioRef.current;
    if (playing && audio) {
      audio.pause();
      setPlaying(false);
      return;
    }

    const loaded = await loadPreviews();
    const source = loaded.length ? loaded : previews;
    await playIndex(Math.min(currentIndex, Math.max(0, source.length - 1)), source);
  }

  async function step(delta: number) {
    const loaded = previews.length ? previews : await loadPreviews();
    if (!loaded.length) return;
    const nextIndex = (currentIndex + delta + loaded.length) % loaded.length;
    await playIndex(nextIndex, loaded);
  }

  return (
    <div
      className={`rounded-lg border border-uv-border bg-uv-bg-primary/45 ${
        compact ? "mt-4 p-3" : "p-3"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-uv-text-primary">
            {compact ? "Preview" : title}
          </p>
          <p className="mt-0.5 text-xs text-uv-text-muted">
            {previews.length ? `${currentIndex + 1}/${previews.length}` : `${queue.length} queued`}
          </p>
        </div>
        <button
          type="button"
          onClick={playOrPause}
          disabled={loading || !queue.length}
          className="rounded-md border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-3 py-2 text-xs font-semibold text-uhchi-teal-bright transition hover:bg-uhchi-secondary/20 disabled:opacity-50"
        >
          {loading ? "Loading" : playing ? "Pause" : "Play"}
        </button>
      </div>

      <audio
        ref={audioRef}
        controls
        preload="none"
        className="mt-3 h-9 w-full"
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={() => {
          if (previews.length > 1 && currentIndex < previews.length - 1) {
            void playIndex(currentIndex + 1);
          } else {
            setPlaying(false);
          }
        }}
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={loading || previews.length < 2}
          className="rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-1 text-[11px] text-uv-text-secondary transition hover:border-uv-purple-bright hover:text-uv-text-primary disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={loading || previews.length < 2}
          className="rounded-md border border-uv-border bg-uv-bg-elevated px-2 py-1 text-[11px] text-uv-text-secondary transition hover:border-uv-purple-bright hover:text-uv-text-primary disabled:opacity-40"
        >
          Next
        </button>
        <p className="min-w-0 flex-1 truncate text-right text-[11px] text-uv-text-secondary">
          {status ?? (current ? `${current.title} - ${current.artist}` : "")}
        </p>
      </div>

      {!compact && previews.length ? (
        <div className="mt-3 max-h-36 space-y-1 overflow-auto pr-1">
          {previews.map((preview, index) => (
            <button
              key={`${preview.trackKey}-${index}`}
              type="button"
              onClick={() => playIndex(index)}
              className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-[11px] transition ${
                index === currentIndex
                  ? "bg-uhchi-secondary/15 text-uhchi-teal-bright"
                  : "bg-uv-bg-elevated/65 text-uv-text-secondary hover:text-uv-text-primary"
              }`}
            >
              {index + 1}. {preview.title} - {preview.artist}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
