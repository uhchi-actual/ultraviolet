"use client";

import { motion } from "framer-motion";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { sendChat } from "@/lib/api";
import type { ChatTurn } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "What should I listen to right now?",
  "Find me something like Ceremony but darker",
  "Why do people like The Cure so much?",
  "Play me something for late-night coding",
];

export default function ChatPage() {
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
    <div>
      <PageHeader
        eyebrow="Conductor"
        title="Chat"
        description="Talk to the Conductor agent, powered by a local LLM. (Phase 1 wires the endpoint; richer responses arrive as later agents come online.)"
      />

      <div className="flex h-[60vh] flex-col overflow-hidden rounded-xl border border-uv-indigo-mid bg-uv-bg-surface/60">
        {/* Messages */}
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
                    className="rounded-full border border-uv-indigo-light px-3 py-1.5 text-xs text-uv-text-secondary transition-colors hover:border-uv-purple-bright hover:text-uv-text-primary"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-uhchi-primary text-white"
                      : "border border-uv-indigo-mid bg-uv-bg-elevated text-uv-text-primary",
                  )}
                >
                  {message.content}
                </div>
              </motion.div>
            ))
          )}

          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-uv-indigo-mid bg-uv-bg-elevated px-4 py-2.5 font-mono text-sm text-uv-text-muted">
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

        {/* Input */}
        <form
          onSubmit={onFormSubmit}
          className="flex gap-2 border-t border-uv-indigo-mid bg-uv-bg-surface/80 p-3"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Message the Conductor…"
            className="flex-1 rounded-lg border border-uv-indigo-mid bg-uv-bg-primary px-4 py-2.5 text-sm text-uv-text-primary placeholder:text-uv-text-muted focus:border-uv-purple-bright focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-uhchi-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-uhchi-red-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
