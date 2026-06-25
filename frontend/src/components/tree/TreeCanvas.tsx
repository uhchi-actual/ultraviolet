"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { AlbumCover } from "@/components/shared/AlbumCover";
import { motifForGenre } from "@/lib/genreMotifs";
import type { TreeGraph, TreeNode } from "@/lib/types";

import { GlowingThreads } from "./GlowingThreads";
import { computeOrganicLayout, type LayoutPos } from "./organicLayout";
import { StarfieldBackground } from "./StarfieldBackground";

const W = 8600;
const H = 6200;
const INITIAL_SCALE = 0.16;

function searchLink(node: TreeNode, service: "spotify" | "youtube" | "soundcloud"): string {
  const query = encodeURIComponent(`${node.artist} ${node.title}`.trim());
  if (service === "spotify") return `https://open.spotify.com/search/${query}`;
  if (service === "soundcloud") return `https://soundcloud.com/search/sounds?q=${query}`;
  return `https://www.youtube.com/results?search_query=${query}`;
}

function TrackNodeButton({
  node,
  pos,
  selected,
  onSelect,
  delay,
  mapScale,
}: {
  node: TreeNode;
  pos: LayoutPos;
  selected: boolean;
  onSelect: () => void;
  delay: number;
  mapScale: number;
}) {
  const size = node.type === "seed" ? 120 : 100;
  const motif = motifForGenre(node.genre_bucket);
  const labelOpacity = selected || mapScale > 0.34 ? 1 : mapScale > 0.22 ? 0.58 : 0;
  const labelY = mapScale > 0.22 ? 0 : -4;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{
        opacity: 1,
        scale: selected ? 1.06 : 1,
        x: pos.x,
        y: pos.y,
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { type: "spring", stiffness: 190, damping: 22, delay },
        x: { type: "spring", stiffness: 34, damping: 15 },
        y: { type: "spring", stiffness: 34, damping: 15 },
      }}
      style={{ position: "absolute", left: 0, top: 0 }}
      data-tree-node-id={node.id}
      className="node-no-pan z-10 -translate-x-1/2 -translate-y-1/2 text-left focus:outline-none"
      onClick={onSelect}
    >
      <div>
        <div
          className="rounded-2xl p-[2px] shadow-[0_0_1.2rem_rgba(0,0,0,0.65)] transition-shadow duration-500"
          style={{
            background: `linear-gradient(145deg, ${motif.primary}, ${motif.secondary})`,
            boxShadow: selected ? `0 0 2.2rem ${motif.glow}` : `0 0 1rem ${motif.dim}`,
          }}
        >
          <AlbumCover
            artist={node.artist}
            title={node.title}
            id={node.id}
            size={size}
            className="rounded-[0.85rem] ring-0"
          />
        </div>
        {node.type === "seed" ? (
          <span
            className="mt-2 block text-center font-mono text-[0.55rem] uppercase tracking-[0.25em]"
            style={{ color: motif.primary }}
          >
            Seed
          </span>
        ) : null}
        <motion.div animate={{ opacity: labelOpacity, y: labelY }} transition={{ duration: 0.2 }}>
          <p className="mt-1 max-w-[150px] truncate text-center font-display text-sm font-semibold text-uv-text-primary drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
            {node.title}
          </p>
          <p className="max-w-[150px] truncate text-center text-xs text-uv-text-muted">{node.artist}</p>
        </motion.div>
      </div>
    </motion.button>
  );
}

export function TreeCanvas({ graph }: { graph: TreeGraph }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, LayoutPos>>(new Map());
  const [mapScale, setMapScale] = useState(INITIAL_SCALE);

  const layoutKey = useMemo(
    () => graph.nodes.map((n) => n.id).join("|") + graph.edges.length,
    [graph],
  );

  useEffect(() => {
    setPositions(computeOrganicLayout(graph, W, H, graph.layout_seed));
  }, [layoutKey, graph]);

  const nodesById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;
  const selectedMotif = motifForGenre(selected?.genre_bucket);
  const seedNodes = useMemo(() => graph.nodes.filter((node) => node.id.startsWith("seed:")), [graph.nodes]);

  return (
    <div className="relative h-[min(86vh,900px)] overflow-hidden rounded-xl border border-uv-border bg-[#030308]">
      <StarfieldBackground />

      <TransformWrapper
        initialScale={INITIAL_SCALE}
        minScale={0.055}
        maxScale={2.8}
        centerOnInit
        limitToBounds={false}
        smooth
        wheel={{ step: 0.0014 }}
        doubleClick={{ disabled: true }}
        zoomAnimation={{ animationTime: 260, animationType: "easeOut" }}
        velocityAnimation={{
          sensitivityMouse: 0.18,
          sensitivityTouch: 0.22,
          maxStrengthMouse: 0.75,
          maxStrengthTouch: 0.85,
          inertia: 0.5,
          animationTime: 420,
        }}
        autoAlignment={{ animationTime: 260, velocityAlignmentTime: 220, sizeX: 80, sizeY: 80 }}
        panning={{ velocityDisabled: false, excluded: ["node-no-pan"] }}
        onTransform={(_, state) => setMapScale(state.scale)}
      >
        {({ zoomIn, zoomOut, resetTransform, zoomToElement }) => (
          <>
            <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => zoomIn(0.12)}
                className="h-8 w-8 rounded-md border border-uv-border bg-uv-bg-surface/80 text-sm backdrop-blur transition hover:border-uv-purple-bright"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => zoomOut(0.12)}
                className="h-8 w-8 rounded-md border border-uv-border bg-uv-bg-surface/80 text-sm backdrop-blur transition hover:border-uv-purple-bright"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => resetTransform(220, "easeOut")}
                className="rounded-md border border-uv-border bg-uv-bg-surface/80 px-3 py-1.5 text-xs text-uv-text-muted backdrop-blur transition hover:border-uv-purple-bright hover:text-uv-text-primary"
              >
                Reset
              </button>
              <span className="rounded-md border border-uv-border bg-uv-bg-surface/70 px-2 py-1 font-mono text-[10px] text-uv-text-muted backdrop-blur">
                {Math.round(mapScale * 100)}%
              </span>
            </div>

            {seedNodes.length ? (
              <div
                data-testid="seed-selector"
                className="absolute right-3 top-3 z-20 max-h-56 w-[min(72vw,320px)] overflow-auto rounded-lg border border-uv-border bg-uv-bg-surface/82 p-2 backdrop-blur"
              >
                <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-uv-text-muted">
                  Seeds
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {seedNodes.slice(0, 48).map((node) => {
                    const motif = motifForGenre(node.genre_bucket);
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(node.id);
                          const target = [...document.querySelectorAll<HTMLElement>("[data-tree-node-id]")]
                            .find((element) => element.getAttribute("data-tree-node-id") === node.id);
                          if (target) zoomToElement(target, 0.52, 360, "easeOut", -220, 0);
                        }}
                        className="truncate rounded-md border bg-uv-bg-primary/60 px-2 py-1.5 text-left text-[11px] text-uv-text-primary transition hover:bg-uv-bg-elevated"
                        style={{
                          borderColor: selectedId === node.id ? motif.primary : `${motif.primary}66`,
                          color: selectedId === node.id ? motif.primary : undefined,
                        }}
                      >
                        {node.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <TransformComponent
              wrapperClass="!h-full !w-full cursor-grab active:cursor-grabbing"
              contentClass="relative"
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
                      mapScale={mapScale}
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
            className="absolute bottom-4 right-4 top-4 z-30 w-[min(100%,320px)] overflow-y-auto rounded-xl border bg-uv-bg-surface/92 p-4 backdrop-blur-md"
            style={{ borderColor: selectedMotif.primary }}
          >
            <AlbumCover artist={selected.artist} title={selected.title} id={selected.id} size={180} />
            <h3 className="mt-3 font-display text-lg font-semibold text-uv-text-primary">{selected.title}</h3>
            <p className="text-sm text-uv-text-secondary">{selected.artist}</p>
            {selected.genre_bucket ? (
              <p
                className="mt-2 inline-flex rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  borderColor: selectedMotif.primary,
                  color: selectedMotif.primary,
                  backgroundColor: selectedMotif.dim,
                }}
              >
                {selected.genre_bucket} / {selectedMotif.mood}
              </p>
            ) : null}
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
              <a
                href={searchLink(selected, "soundcloud")}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-uv-border bg-uv-bg-elevated px-3 py-1.5 text-xs font-medium text-uv-text-primary hover:border-uv-purple-bright"
              >
                SoundCloud
              </a>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
