import { ComingSoon } from "@/components/shared/ComingSoon";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AnalyzePage() {
  return (
    <div>
      <PageHeader
        eyebrow="DJ agent"
        title="Analyze"
        description="Upload a track and see its full 15-identifier breakdown, computed locally with librosa + essentia."
      />
      <ComingSoon
        phase={2}
        points={[
          "Drag-and-drop upload for MP3, FLAC, WAV, OGG, M4A",
          "15-identifier radar chart and breakdown table",
          "Instrumentation profile and 4-point emotional arc",
          "Waveform display with quarter markers, and “add to library”",
        ]}
      />
    </div>
  );
}
