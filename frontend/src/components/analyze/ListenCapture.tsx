"use client";

import { useCallback, useRef, useState } from "react";

import { analyzeTrack } from "@/lib/api";
import { captureBlobToWavFile } from "@/lib/captureToWav";
import type { AnalyzeResponse } from "@/lib/types";

const CAPTURE_SECONDS = 12;

type Props = {
  onResult: (data: AnalyzeResponse) => void;
  onError: (msg: string) => void;
  onAnalyzing?: () => void;
  disabled?: boolean;
};

/** Chrome requires audio-only streams for audio/webm; tab capture always includes video. */
function createTabRecorder(displayStream: MediaStream): MediaRecorder {
  const audioTracks = displayStream.getAudioTracks();
  if (!audioTracks.length) {
    throw new Error("NO_AUDIO");
  }

  const audioStream = new MediaStream(audioTracks);
  const mimeCandidates = [
    { stream: audioStream, mime: "audio/webm;codecs=opus" },
    { stream: audioStream, mime: "audio/webm" },
    { stream: audioStream, mime: undefined },
    { stream: displayStream, mime: "video/webm;codecs=vp9,opus" },
    { stream: displayStream, mime: "video/webm;codecs=vp8,opus" },
    { stream: displayStream, mime: "video/webm" },
    { stream: displayStream, mime: undefined },
  ];

  let lastError: unknown;
  for (const { stream, mime } of mimeCandidates) {
    if (mime && !MediaRecorder.isTypeSupported(mime)) continue;
    try {
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorder.start(1000);
      return recorder;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not start recorder in this browser.");
}

export function ListenCapture({ onResult, onError, onAnalyzing, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [guessArtist, setGuessArtist] = useState("");
  const [guessTitle, setGuessTitle] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current = null;
    setListening(false);
    setSecondsLeft(0);
  }, []);

  const startListen = useCallback(async () => {
    if (disabled || listening) return;
    setListening(true);
    chunksRef.current = [];

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (!stream.getAudioTracks().length) {
        stopAll();
        onError(
          "No audio track. Pick the tab playing music and enable Share tab audio in the Chrome dialog.",
        );
        return;
      }

      const recorder = createTabRecorder(stream);
      recorderRef.current = recorder;

      // End screen-share video once recording starts — we only need audio.
      stream.getVideoTracks().forEach((t) => t.stop());

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        stopAll();
        if (blob.size < 1000) {
          onError("Capture too short. Play music louder or capture the full 12 seconds.");
          return;
        }
        try {
          const file = await captureBlobToWavFile(blob, `listen-${Date.now()}`);
          onAnalyzing?.();
          onResult(
            await analyzeTrack(
              file,
              guessTitle.trim() || undefined,
              guessArtist.trim() || undefined,
            ),
          );
        } catch (err) {
          onError(err instanceof Error ? err.message : "Analysis failed");
        }
      };

      setSecondsLeft(CAPTURE_SECONDS);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (recorder.state === "recording") recorder.stop();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err) {
      stopAll();
      if (err instanceof Error && err.message === "NO_AUDIO") {
        onError(
          "No audio track. Pick the tab playing music and enable Share tab audio in the Chrome dialog.",
        );
      } else if (err instanceof Error && err.name === "NotAllowedError") {
        onError("Permission denied. Allow screen/tab sharing to identify audio.");
      } else if (err instanceof Error && err.name === "NotSupportedError") {
        onError("Audio capture is not supported in this browser. Try Chrome and share a tab with audio.");
      } else {
        onError(err instanceof Error ? err.message : "Could not capture audio");
      }
    }
  }, [disabled, listening, onAnalyzing, onError, onResult, stopAll, guessArtist, guessTitle]);

  return (
    <div className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-uv-purple-bright">
        Listen mode
      </p>
      <p className="mt-2 text-sm text-uv-text-secondary">
        Identify what is playing — in the share dialog, select the <strong className="text-uv-text-primary">Chrome tab</strong>{" "}
        where music is playing (e.g. Spotify), then check <strong className="text-uv-text-primary">Share tab audio</strong>.
        We record {CAPTURE_SECONDS}s and run the same Demucs analysis as upload.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Artist (optional)"
          value={guessArtist}
          onChange={(e) => setGuessArtist(e.target.value)}
          className="rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-2 text-sm text-uv-text-primary"
        />
        <input
          type="text"
          placeholder="Title (optional)"
          value={guessTitle}
          onChange={(e) => setGuessTitle(e.target.value)}
          className="rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-2 text-sm text-uv-text-primary"
        />
      </div>
      <p className="mt-2 text-xs text-uv-text-muted">
        Know the track? Fill in artist/title before listening — dramatically improves identification.
      </p>
      <button
        type="button"
        disabled={disabled || listening}
        onClick={startListen}
        className="mt-4 rounded-lg border border-uhchi-secondary/50 bg-uhchi-secondary/10 px-5 py-2.5 font-display text-sm font-semibold text-uhchi-teal-bright transition hover:bg-uhchi-secondary/20 disabled:opacity-50"
      >
        {listening ? `Listening… ${secondsLeft}s` : "Identify playing audio"}
      </button>
      {listening ? (
        <p className="mt-2 text-xs text-uv-text-muted">
          Keep music playing. Do not share this Analyze tab — share the tab with the player.
        </p>
      ) : null}
    </div>
  );
}
