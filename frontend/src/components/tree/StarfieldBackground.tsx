"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  layer: number;
  phase: number;
  flicker: number;
  opacity: number;
};

const LAYERS = [
  { count: 120, parallax: 0.02, drift: 0.00005 },
  { count: 160, parallax: 0.04, drift: 0.00007 },
  { count: 90, parallax: 0.06, drift: 0.00009 },
];

function seedStars(): Star[] {
  const stars: Star[] = [];
  for (let li = 0; li < LAYERS.length; li++) {
    const layer = LAYERS[li];
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        layer: li,
        phase: Math.random() * Math.PI * 2,
        flicker: 0.8 + Math.random() * 2.2,
        opacity: 0.18 + Math.random() * 0.42,
      });
    }
  }
  return stars;
}

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const starsRef = useRef<Star[]>(seedStars());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w;
      canvas.height = h;
    };

    resize();
    const parent = canvas.parentElement;
    const ro = new ResizeObserver(resize);
    if (parent) ro.observe(parent);

    const onMove = (e: MouseEvent) => {
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      mouse.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };
    parent?.addEventListener("mousemove", onMove);

    const draw = (t: number) => {
      ctx.fillStyle = "#030308";
      ctx.fillRect(0, 0, w, h);

      const mx = (mouse.current.x - 0.5) * 2;
      const my = (mouse.current.y - 0.5) * 2;

      for (const star of starsRef.current) {
        const layer = LAYERS[star.layer];
        const twinkle =
          0.4 +
          0.6 *
            Math.abs(Math.sin(t * 0.0022 * star.flicker + star.phase)) **
              (0.6 + (star.phase % 1) * 0.8);
        const alpha = Math.min(0.85, star.opacity * twinkle);

        const px =
          (star.x + mx * layer.parallax + Math.sin(t * layer.drift + star.phase) * 0.003) * w;
        const py =
          (star.y + my * layer.parallax + Math.cos(t * layer.drift * 0.9 + star.phase) * 0.003) *
          h;

        const bright = star.layer === 2;
        ctx.fillStyle = bright
          ? `rgba(230, 220, 255, ${alpha})`
          : `rgba(195, 200, 225, ${alpha * 0.9})`;
        ctx.fillRect(Math.floor(px), Math.floor(py), bright ? 2 : 1, bright ? 2 : 1);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      parent?.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
  );
}
