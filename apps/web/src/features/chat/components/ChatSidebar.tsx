"use client";

import { useRef, useEffect, useState } from "react";
import type { Message } from "@ai-sdk/react";
import type { TimeBlock } from "@organizaTUM/shared";
import { Icon } from "@/components/Icon";
import { Composer } from "./Composer";
interface ChatSidebarProps {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isTyping: boolean;
  onAction: (action: "regenerate" | "export" | "reset") => void;
  agentStatus: string | null;
  refineBlock?: TimeBlock | null;
  onClearBlock?: () => void;
}

export function ChatSidebar({
  messages, input, setInput, onSend, isTyping,
  onAction, agentStatus,
  refineBlock, onClearBlock,
}: ChatSidebarProps) {
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messages, isTyping, agentStatus]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-raised)", borderRight: "1px solid var(--line)" }}>
      {/* Agent status pill */}
      {agentStatus && (
        <div style={{ margin: "12px 18px 0", padding: "7px 10px", background: "var(--bg-sunken)", border: "1px solid var(--line-soft)", borderRadius: 8, fontSize: 11.5, color: "var(--ink-2)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(62% 0.12 30)", animation: "typingPulse 1.2s infinite" }}/>
          {agentStatus}
        </div>
      )}

      {/* Messages */}
      <div className="scroll" ref={msgRef} style={{ flex: 1, overflowY: "auto", padding: "18px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => (
          <MessageBubble key={m.id} role={m.role as "user" | "assistant"} content={m.content}/>
        ))}
        {isTyping && <TypingIndicator/>}
      </div>

      {/* Composer */}
      <Composer
        variant="sidebar"
        value={input}
        onChange={setInput}
        onSend={onSend}
        placeholder="Keep answering, or ask to tweak..."
        refineBlock={refineBlock}
        onClearBlock={onClearBlock}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, padding: "0 14px 14px", borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
        <ActionBtn onClick={() => onAction("regenerate")}><Icon name="refresh" size={13}/> Regenerate</ActionBtn>
        <ActionBtn onClick={() => onAction("export")}><Icon name="export" size={13}/> Export .ics</ActionBtn>
        <ActionBtn onClick={() => onAction("reset")}><Icon name="plus" size={13}/> New</ActionBtn>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
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
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink)", maxWidth: "92%" }}>{content}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{ flex: 1, padding: "8px 10px", fontSize: 12, color: "var(--ink-2)", background: "var(--surface)", border: hov ? "1px solid var(--ink-4)" : "1px solid var(--line)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 140ms ease" }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}
