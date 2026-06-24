"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import type { TreeGraph, TreeNode } from "@/lib/types";

import { AlbumCover } from "@/components/shared/AlbumCover";
import { GlowingThreads } from "./GlowingThreads";
import { computeOrganicLayout, type LayoutPos } from "./organicLayout";
import { StarfieldBackground } from "./StarfieldBackground";

const W = 4200;
const H = 3000;

function hashFloat(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function searchLink(node: TreeNode, service: "spotify" | "youtube"): string {
  const query = encodeURIComponent(`${node.artist} ${node.title}`.trim());
  if (service === "spotify") return `https://open.spotify.com/search/${query}`;
  return `https://www.youtube.com/results?search_query=${query}`;
}

function TrackNodeButton({
  node,
  pos,
  selected,
  onSelect,
  delay,
}: {
  node: TreeNode;
  pos: LayoutPos;
  selected: boolean;
  onSelect: () => void;
  delay: number;
}) {
  const size = node.type === "seed" ? 120 : 100;
  const drift = hashFloat(node.id);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{
        opacity: 1,
        scale: selected ? 1.07 : 1,
        x: pos.x,
        y: pos.y,
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { type: "spring", stiffness: 200, damping: 20, delay },
        x: { type: "spring", stiffness: 40, damping: 12 },
        y: { type: "spring", stiffness: 40, damping: 12 },
      }}
      style={{ position: "absolute", left: 0, top: 0 }}
      className="node-no-pan z-10 -translate-x-1/2 -translate-y-1/2 text-left focus:outline-none"
      onClick={onSelect}
    >
      <motion.div
        animate={{ y: [0, -5 - drift * 4, 0] }}
        transition={{ duration: 4 + drift * 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <AlbumCover artist={node.artist} title={node.title} id={node.id} size={size} />
        {node.type === "seed" ? (
          <span className="mt-2 block text-center font-mono text-[0.55rem] uppercase tracking-[0.25em] text-uhchi-primary">
            Seed
          </span>
        ) : null}
        <p className="mt-1 max-w-[150px] truncate text-center font-display text-sm font-semibold text-uv-text-primary">
          {node.title}
        </p>
        <p className="max-w-[150px] truncate text-center text-xs text-uv-text-muted">{node.artist}</p>
      </motion.div>
    </motion.button>
  );
}

export function TreeCanvas({ graph }: { graph: TreeGraph }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, LayoutPos>>(new Map());

  const layoutKey = useMemo(
    () => graph.nodes.map((n) => n.id).join("|") + graph.edges.length,
    [graph],
  );

  useEffect(() => {
    setPositions(computeOrganicLayout(graph, W, H, graph.layout_seed));
  }, [layoutKey, graph]);

  const nodesById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="relative h-[min(85vh,880px)] overflow-hidden rounded-2xl border border-uv-border bg-[#030308]">
      <StarfieldBackground />

      <TransformWrapper
        initialScale={0.42}
        minScale={0.12}
        maxScale={2.8}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: false, excluded: ["node-no-pan"] }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute left-3 top-3 z-20 flex gap-2">
              <button type="button" onClick={() => zoomIn()} className="rounded-lg border border-uv-border bg-uv-bg-surface/80 px-3 py-1 text-sm backdrop-blur">+</button>
              <button type="button" onClick={() => zoomOut()} className="rounded-lg border border-uv-border bg-uv-bg-surface/80 px-3 py-1 text-sm backdrop-blur">−</button>
              <button type="button" onClick={() => resetTransform()} className="rounded-lg border border-uv-border bg-uv-bg-surface/80 px-3 py-1 text-xs text-uv-text-muted backdrop-blur">Reset</button>
            </div>

            <TransformComponent
              wrapperClass="!h-full !w-full cursor-grab active:cursor-grabbing"
              contentClass="!h-full !w-full"
            >
              <div className="relative" style={{ width: W, height: H }}>
                <GlowingThreads edges={graph.edges} positions={positions} nodesById={nodesById} />
                {graph.nodes.map((node, i) => {
                  const pos = positions.get(node.id);
                  if (!pos) return null;
                  return (
                    <TrackNodeButton
                      key={node.id}
                      node={node}
                      pos={pos}
                      selected={selectedId === node.id}
                      onSelect={() => setSelectedId(node.id === selectedId ? null : node.id)}
                      delay={0.04 + i * 0.025}
                    />
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      <AnimatePresence>
        {selected ? (
          <motion.aside
            key={selected.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="absolute bottom-4 right-4 top-4 z-30 w-[min(100%,300px)] overflow-y-auto rounded-xl border border-uv-border bg-uv-bg-surface/95 p-4 backdrop-blur-md"
          >
            <AlbumCover artist={selected.artist} title={selected.title} id={selected.id} size={180} />
            <h3 className="mt-3 font-display text-lg font-semibold text-uv-text-primary">{selected.title}</h3>
            <p className="text-sm text-uv-text-secondary">{selected.artist}</p>
            {selected.why_summary ? (
              <p className="mt-3 text-sm leading-relaxed text-uv-text-primary">{selected.why_summary}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={searchLink(selected, "spotify")}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-1.5 text-xs font-medium text-uv-text-primary hover:border-uv-purple-bright"
              >
                Spotify
              </a>
              <a
                href={searchLink(selected, "youtube")}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-1.5 text-xs font-medium text-uv-text-primary hover:border-uv-purple-bright"
              >
                YouTube
              </a>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
