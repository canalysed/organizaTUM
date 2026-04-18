"use client";

import { useRef, useEffect } from "react";
import type { Message } from "@ai-sdk/react";
import type { TimeBlock } from "@organizaTUM/shared";
import { Composer } from "./Composer";
import { type SelectionSlot } from "@/features/calendar/components/CalendarGrid";

interface ChatFloatProps {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isTyping: boolean;
  refineBlock?: TimeBlock | null;
  onClearBlock?: () => void;
  selection?: SelectionSlot[];
  onClearSelection?: () => void;
}

export function ChatFloat({
  messages, input, setInput, onSend, isTyping,
  refineBlock, onClearBlock, selection, onClearSelection,
}: ChatFloatProps) {
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messages, isTyping]);

  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", padding: "0 24px 20px", height: "100%" }}>
        <div
          className="scroll"
          ref={msgRef}
          style={{
            flex: 1, overflowY: "auto",
            padding: "28px 4px 20px",
            display: "flex", flexDirection: "column", gap: 22,
            maskImage: "linear-gradient(to bottom, transparent 0, black 30px, black calc(100% - 10px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 30px, black calc(100% - 10px), transparent 100%)",
          }}
        >
          {messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => (
            <MessageBubble key={m.id} role={m.role as "user" | "assistant"} content={m.content} float/>
          ))}
          {isTyping && <TypingIndicator/>}
        </div>

        <Composer
          variant="float"
          value={input}
          onChange={setInput}
          onSend={onSend}
          placeholder="Reply..."
          refineBlock={refineBlock}
          onClearBlock={onClearBlock}
          selection={selection}
          onClearSelection={onClearSelection}
        />
      </div>
    </div>
  );
}

function MessageBubble({ role, content, float }: { role: "user" | "assistant"; content: string; float?: boolean }) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", animation: "fadeUp 400ms both" }}>
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-2)", background: "var(--surface)", border: "1px solid var(--line)", padding: "9px 13px", borderRadius: 12, maxWidth: "85%" }}>
          {content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeUp 400ms both" }}>
      <div style={{ fontSize: float ? 16 : 15, lineHeight: float ? 1.6 : 1.55, color: "var(--ink)", maxWidth: float ? "100%" : "92%" }}>
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeUp 400ms both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono, monospace)" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-3)", animation: `typingPulse 1.2s ${i * 160}ms infinite ease-in-out` }}/>
          ))}
        </div>
      </div>
    </div>
  );
}
