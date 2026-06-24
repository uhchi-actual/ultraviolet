import { AnalyzePanel } from "@/components/analyze/AnalyzePanel";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AnalyzePage() {
  return (
    <div>
      <PageHeader
        eyebrow="DJ agent"
        title="Analyze"
        description="Search the baked FMA catalog in-browser. Upload and stem separation are available only in the local full stack."
      />
      <AnalyzePanel />
    </div>
  );
}
