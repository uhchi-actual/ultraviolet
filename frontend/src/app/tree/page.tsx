import { ComingSoon } from "@/components/shared/ComingSoon";
import { PageHeader } from "@/components/shared/PageHeader";

export default function TreePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Explainable traceback"
        title="Tree"
        description="An interactive, force-directed graph of the recommendation provenance web — the flagship visualization."
      />
      <ComingSoon
        phase={4}
        points={[
          "React Flow graph with custom seed / library / recommendation nodes",
          "D3 force layout that clusters sonically similar tracks",
          "Identifier-labeled edges weighted by match strength",
          "Click-to-expand, detail panel, and ambient breathing animation",
        ]}
      />
    </div>
  );
}
