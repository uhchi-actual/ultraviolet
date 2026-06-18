import { StaticUnavailable } from "@/components/shared/StaticUnavailable";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ChatPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Conductor"
        title="Chat"
        description="Talk to the Conductor agent, powered by a local LLM."
      />
      <StaticUnavailable
        feature="Chat"
        hint="The Conductor agent runs on a local backend with an LLM. Use Tree to explore recommendations from the bundled FMA catalog."
      />
    </div>
  );
}
