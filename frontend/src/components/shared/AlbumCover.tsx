"use client";

import { useEffect, useState } from "react";

import { albumGradient, albumInitials, proceduralCoverDataUrl } from "@/lib/albumArt";
import { fetchAlbumArt } from "@/lib/fetchAlbumArt";

export function AlbumCover({
  artist,
  title,
  id,
  size,
  className = "",
}: {
  artist: string;
  title: string;
  id: string;
  size: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string>("");
  const [c1, c2] = albumGradient(id);

  useEffect(() => {
    setFallback(proceduralCoverDataUrl(id, 400));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetchAlbumArt(artist, title).then((art) => {
      if (!cancelled) setUrl(art);
    });
    return () => {
      cancelled = true;
    };
  }, [artist, title]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-lg shadow-black/50 ring-1 ring-white/15 ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${title} cover`}
          className="h-full w-full object-cover"
          width={size}
          height={size}
        />
      ) : fallback ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallback}
          alt={`${title} cover`}
          className="h-full w-full object-cover"
          width={size}
          height={size}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-white/90"
          style={{ background: `linear-gradient(145deg, ${c1}, ${c2})` }}
        >
          {albumInitials(title)}
        </div>
      )}
    </div>
  );
}
