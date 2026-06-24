"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

const MAX_POINTS = 18;

export function SpiderWebCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let lastEmit = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const emit = (x: number, y: number) => {
      pointsRef.current.unshift({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        life: 1,
      });
      pointsRef.current = pointsRef.current.slice(0, MAX_POINTS);
    };

    const onMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY, active: true };
      const now = performance.now();
      if (now - lastEmit > 34) {
        emit(event.clientX, event.clientY);
        lastEmit = now;
      }
    };

    const onLeave = () => {
      mouseRef.current.active = false;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const points = pointsRef.current;

      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life *= 0.965;
        if (p.life < 0.04) points.splice(i, 1);
      }

      if (mouseRef.current.active) {
        const { x, y } = mouseRef.current;
        ctx.strokeStyle = "rgba(34, 211, 238, 0.16)";
        ctx.lineWidth = 1;
        for (let i = 0; i < Math.min(points.length, 9); i++) {
          const p = points[i];
          const alpha = 0.16 * p.life;
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        ctx.fillStyle = `rgba(226, 232, 240, ${0.38 * a.life})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.1, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const b = points[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > 165) continue;
          const alpha = (1 - dist / 165) * a.life * b.life * 0.18;
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-80 mix-blend-screen"
    />
  );
}
