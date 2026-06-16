"use client";

import { motion } from "framer-motion";

import type { ChatTurn } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessageBubble({ role, content }: ChatTurn) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-uhchi-primary text-white"
            : "border border-uv-indigo-mid bg-uv-bg-elevated text-uv-text-primary",
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}
