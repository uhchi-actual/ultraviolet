import { AnalyzePanel } from "@/components/analyze/AnalyzePanel";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AnalyzePage() {
  return (
    <div>
      <PageHeader
        eyebrow="DJ agent"
        title="Analyze"
        description="Upload a track and the DJ agent separates it with Demucs (drums, bass, vocals, other, guitar, piano), then measures only identifiers we can back with real stem data. No guesses, no metadata."
      />
      <AnalyzePanel />
    </div>
  );
}
