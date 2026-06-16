"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

const ACCEPT = ".mp3,.flac,.wav,.ogg,.m4a,audio/*";

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
        dragging
          ? "border-uv-purple-bright bg-uv-bg-elevated"
          : "border-uv-border-strong bg-uv-bg-surface/60 hover:border-uv-purple-bright hover:bg-uv-bg-surface",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span className="uv-gradient-bg flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_0_1.25rem_var(--uv-glow)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
      </span>
      <div>
        <p className="font-display text-base font-medium text-uv-text-primary">
          {disabled ? "Analyzing…" : "Drop a track, or click to browse"}
        </p>
        <p className="mt-1 font-mono text-xs text-uv-text-muted">MP3 · FLAC · WAV · OGG · M4A — up to 50 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
