import Link from "next/link";

import { GlowCard } from "@/components/shared/GlowCard";
import { HealthPill } from "@/components/shared/HealthPill";
import { IDENTIFIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    name: "SOUL",
    tagline: "User profiler",
    body: "Builds a living profile of your musical identity from personal data via a RAG pipeline over ChromaDB.",
  },
  {
    name: "DJ",
    tagline: "Music analyzer",
    body: "Extracts a 15-identifier audio fingerprint from any track using librosa + essentia. No LLM, pure signal.",
  },
  {
    name: "Conductor",
    tagline: "Orchestrator",
    body: "Routes queries, runs the recommendation engine, builds the Tree, and explains every pick in natural language.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* ── Hero ── */}
      <section className="flex flex-col items-start gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="uv-gradient-text font-mono text-xs uppercase tracking-[0.2em]">
            Multi-agent music recommendation
          </span>
          <HealthPill />
        </div>

        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          <span className="uv-gradient-text">Ultraviolet</span>
        </h1>

        <p className="max-w-2xl text-lg text-uv-text-secondary">
          A locally-deployed, content-based recommendation engine. It listens to the
          audio itself — so a track with 12 plays gets the same treatment as one with
          50 million streams — and shows you <em>why</em> every recommendation was made.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/analyze"
            className="uv-gradient-bg rounded-lg px-5 py-2.5 font-medium text-white shadow-[0_0_1.5rem_var(--uv-glow)] transition-opacity hover:opacity-90"
          >
            Analyze a track
          </Link>
          <Link
            href="/radio"
            className="rounded-lg border border-uv-border-strong px-5 py-2.5 font-medium text-uv-text-primary transition-colors hover:border-uv-purple-bright hover:bg-uv-bg-elevated"
          >
            Open Radio
          </Link>
        </div>
      </section>

      {/* ── Agents ── */}
      <section>
        <h2 className="mb-6 font-display text-2xl font-semibold text-uv-text-primary">
          Three agents, one orchestra
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {AGENTS.map((agent) => (
            <GlowCard key={agent.name}>
              <h3 className="font-display text-xl font-semibold text-uv-text-primary">
                {agent.name}
              </h3>
              <p className="uv-gradient-text mb-3 font-mono text-xs uppercase tracking-wider">
                {agent.tagline}
              </p>
              <p className="text-sm leading-relaxed text-uv-text-secondary">
                {agent.body}
              </p>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* ── 15 identifiers ── */}
      <section>
        <h2 className="mb-2 font-display text-2xl font-semibold text-uv-text-primary">
          The 15 audio identifiers
        </h2>
        <p className="mb-6 max-w-2xl text-sm text-uv-text-secondary">
          Every track is fingerprinted across eight Spotify-equivalent features and
          seven custom niche identifiers that connect music across genre lines.
        </p>
        <div className="flex flex-wrap gap-2">
          {IDENTIFIERS.map((identifier) => {
            const niche = identifier.category !== "Sonic Foundation";
            return (
              <span
                key={identifier.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border bg-uv-bg-elevated px-3 py-1.5 font-mono text-xs",
                  niche ? "border-uv-border-strong" : "border-uv-border",
                )}
              >
                <span className="text-uv-text-muted">{identifier.id}</span>
                <span className={niche ? "uv-gradient-text" : "text-uv-text-secondary"}>
                  {identifier.name}
                </span>
              </span>
            );
          })}
        </div>
      </section>

      {/* ── Status ── */}
      <section className="rounded-xl border border-uv-border bg-uv-bg-surface/50 p-6">
        <p className="uv-gradient-text font-mono text-xs uppercase tracking-[0.2em]">
          Project status
        </p>
        <p className="mt-2 text-uv-text-secondary">
          <span className="text-uv-text-primary">Phase 1 — Foundation.</span> The
          full stack scaffolding is in place: Docker Compose, the FastAPI backend with
          a live chat endpoint, and this themed Next.js frontend. Audio analysis,
          profiling, recommendations, and the Tree arrive in later phases.
        </p>
      </section>
    </div>
  );
}
