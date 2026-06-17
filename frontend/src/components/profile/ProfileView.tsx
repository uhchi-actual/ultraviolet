"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import type { ProfileResponse } from "@/lib/types";

import { IngestPanel } from "./IngestPanel";
import { ListeningHeatmap } from "./ListeningHeatmap";
import { TasteRadar } from "./TasteRadar";
import { TopArtists } from "./TopArtists";
import { TopGenres } from "./TopGenres";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
      <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-uv-text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-uv-text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold capitalize text-uv-text-primary">{value}</p>
    </div>
  );
}

export function ProfileView({
  profile,
  onReingested,
}: {
  profile: ProfileResponse;
  onReingested: () => void;
}) {
  const [showIngest, setShowIngest] = useState(false);
  const topGenre = profile.top_genres[0]?.genre ?? "—";
  const updated = new Date(profile.last_updated).toLocaleDateString();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
        <div className="flex flex-wrap gap-8">
          <Stat label="Tracks analyzed" value={profile.total_tracks_analyzed.toLocaleString()} />
          <Stat label="Listening hours" value={profile.total_listening_hours.toLocaleString()} />
          <Stat label="Top genre" value={topGenre} />
        </div>
        <button
          type="button"
          onClick={() => setShowIngest((v) => !v)}
          className="rounded-lg border border-uv-border-strong px-3 py-2 text-sm text-uv-text-secondary transition-colors hover:border-uv-purple-bright hover:text-uv-text-primary"
        >
          {showIngest ? "Cancel" : "Update data"}
        </button>
      </div>

      {showIngest && (
        <Panel title="Update your data">
          <IngestPanel
            onIngested={() => {
              setShowIngest(false);
              onReingested();
            }}
          />
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Taste radar">
          <TasteRadar taste={profile.taste_vector} />
        </Panel>
        <Panel title="Top genres">
          <TopGenres genres={profile.top_genres} />
        </Panel>
      </div>

      <Panel title="Listening pattern">
        <ListeningHeatmap heatmap={profile.listening_heatmap} />
      </Panel>

      <Panel title="Top artists">
        <TopArtists artists={profile.top_artists} />
      </Panel>

      <p className="text-center font-mono text-xs text-uv-text-muted">
        profile synthesized {updated} · SOUL agent
      </p>
    </div>
  );
}
