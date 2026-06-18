import { StaticUnavailable } from "@/components/shared/StaticUnavailable";
import { PageHeader } from "@/components/shared/PageHeader";

export default function RadioPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Recommendations"
        title="Radio"
        description="Stream recommendations from a seed track."
      />
      <StaticUnavailable
        feature="Radio"
        hint="Radio playback needs the backend. Tree builds the same recommendation graph in-browser — try New Order - Ceremony."
      />
    </div>
  );
}
