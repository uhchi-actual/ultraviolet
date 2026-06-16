import { ChatWindow } from "@/components/chat/ChatWindow";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ChatPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Conductor"
        title="Chat"
        description="Talk to the Conductor agent, powered by a local LLM. (Phase 1 wires the endpoint; richer responses arrive as later agents come online.)"
      />
      <ChatWindow />
    </div>
  );
}
