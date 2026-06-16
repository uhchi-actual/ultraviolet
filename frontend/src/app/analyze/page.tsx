import { AnalyzePanel } from "@/components/analyze/AnalyzePanel";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AnalyzePage() {
  return (
    <div>
      <PageHeader
        eyebrow="DJ agent"
        title="Analyze"
        description="Upload a track and the DJ agent fingerprints it locally with librosa — a 15-identifier breakdown across rhythm, harmony, texture, and instrumentation. No streams, no metadata, just the signal."
      />
      <AnalyzePanel />
    </div>
  );
}
