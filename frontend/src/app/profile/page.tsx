"use client";

import { useCallback, useEffect, useState } from "react";

import { IngestPanel } from "@/components/profile/IngestPanel";
import { ProfileView } from "@/components/profile/ProfileView";
import { PageHeader } from "@/components/shared/PageHeader";
import { getProfile } from "@/lib/api";
import type { ProfileResponse } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await getProfile());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow="Your musical identity"
        title="Profile"
        description="The SOUL agent reads your listening history, embeds it for retrieval, and synthesizes a living portrait of your taste — what you reach for, when, and why."
      />

      {loading ? (
        <p className="font-mono text-sm text-uv-text-muted">Loading profile…</p>
      ) : profile ? (
        <ProfileView profile={profile} onReingested={load} />
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
            <h3 className="font-display text-lg font-semibold text-uv-text-primary">
              Build your profile
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-uv-text-secondary">
              Upload your Spotify <span className="text-uv-text-primary">extended streaming history</span>{" "}
              (request it from Spotify → Privacy settings). SOUL parses every play, maps when you listen,
              ranks your artists, and infers a 15‑dimension taste vector from your most‑played artists using
              the local LLM. Everything stays on your machine.
            </p>
          </div>
          <div className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-5">
            <IngestPanel onIngested={load} />
          </div>
        </div>
      )}
    </div>
  );
}
