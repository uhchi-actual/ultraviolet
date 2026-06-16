import { ComingSoon } from "@/components/shared/ComingSoon";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Your musical identity"
        title="Profile"
        description="A visualization of the SOUL agent's understanding of your taste, built from your personal listening data."
      />
      <ComingSoon
        phase={3}
        points={[
          "15-axis taste radar of your identifier preference weights",
          "Top genres / subgenres ranking",
          "7×24 listening pattern heatmap",
          "Taste drift over time and artist affinity clusters",
        ]}
      />
    </div>
  );
}
