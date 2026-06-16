import { ComingSoon } from "@/components/shared/ComingSoon";
import { PageHeader } from "@/components/shared/PageHeader";

export default function RadioPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Radio mode"
        title="Radio"
        description="Seed a track and generate niche recommendations, each with a full provenance chain explaining why it was picked."
      />
      <ComingSoon
        phase={4}
        points={[
          "Seed input: search the library or upload a track to analyze",
          "Obscurity dial (0–100%) to tune mainstream vs deep-cuts discovery",
          "Recommendation cards with confidence scores and expandable provenance",
          "“View in Tree” links into the force-directed graph",
        ]}
      />
    </div>
  );
}
