"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { sendChat } from "@/lib/api";
import type { ChatTurn } from "@/lib/types";

const EXAMPLES = [
  "What should I listen to right now?",
  "Find me something like Ceremony but darker",
  "Why do people like The Cure so much?",
  "Play me something for late-night coding",
];

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const history = messages;
    setMessages([...history, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChat(trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function onFormSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  return (
    <div className="flex h-[60vh] flex-col overflow-hidden rounded-xl border border-uv-border bg-uv-bg-surface/60">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-uv-text-secondary">Ask the Conductor anything about music.</p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void submit(example)}
                  className="rounded-full border border-uv-border-strong px-3 py-1.5 text-xs text-uv-text-secondary transition-colors hover:border-uv-purple-bright hover:text-uv-text-primary"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={index} role={message.role} content={message.content} />
          ))
        )}

        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-uv-border bg-uv-bg-elevated px-4 py-2.5 font-mono text-sm text-uv-text-muted">
              Conductor is thinking…
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-uv-error/40 bg-uv-error/10 px-4 py-2.5 text-sm text-uv-error">
              {error}
            </div>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={onFormSubmit}
        className="flex gap-2 border-t border-uv-border bg-uv-bg-surface/80 p-3"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Message the Conductor…"
          className="flex-1 rounded-lg border border-uv-border bg-uv-bg-primary px-4 py-2.5 text-sm text-uv-text-primary placeholder:text-uv-text-muted focus:border-uv-purple-bright focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="uv-gradient-bg rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_1rem_var(--uv-glow)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
