/** Deterministic album-art placeholder from track id (no external API). */

export function albumGradient(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const h1 = hash % 360;
  const h2 = (h1 + 40 + (hash % 80)) % 360;
  return [`hsl(${h1} 55% 32%)`, `hsl(${h2} 70% 48%)`];
}

export function albumInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (title.slice(0, 2) || "UV").toUpperCase();
}

/** Cosmic noise canvas — fallback when iTunes/MusicBrainz have no hit. */
export function proceduralCoverDataUrl(id: string, size = 600): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;

  const [c1, c2] = albumGradient(id);
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const rng = (n: number) => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return (hash % 1000) / 1000;
  };

  for (let i = 0; i < 1200; i++) {
    const x = rng(i) * size;
    const y = rng(i + 1) * size;
    const r = 0.5 + rng(i + 2) * 2.5;
    const a = 0.08 + rng(i + 3) * 0.35;
    ctx.fillStyle = `rgba(255,${180 + Math.floor(rng(i) * 60)},255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const cx = size * (0.35 + (hash % 30) / 100);
  const cy = size * (0.4 + ((hash >> 4) % 20) / 100);
  const ring = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.45);
  ring.addColorStop(0, "rgba(255,40,140,0.55)");
  ring.addColorStop(0.35, "rgba(120,20,180,0.25)");
  ring.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.92);
}
