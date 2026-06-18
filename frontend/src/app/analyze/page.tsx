import { AnalyzePanel } from "@/components/analyze/AnalyzePanel";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AnalyzePage() {
  return (
    <div>
      <PageHeader
        eyebrow="DJ agent"
        title="Analyze"
        description="Upload a track. Demucs separates drums, bass, vocals, and other — then we measure only what the stems actually support."
      />
      <AnalyzePanel />
    </div>
  );
}
