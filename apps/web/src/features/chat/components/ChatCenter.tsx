"use client";

import { useState } from "react";
import type { TimeBlock } from "@organizaTUM/shared";
import { Icon } from "@/components/Icon";
import { Composer } from "./Composer";

const SUGGESTIONS = [
  "Plan my week around 4 CS courses",
  "I learn better with short sessions",
  "Help me fit bouldering on Tuesdays",
  "Review my schedule for next week",
];

interface ChatCenterProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onSuggestion: (s: string) => void;
  refineBlock?: TimeBlock | null;
  onClearBlock?: () => void;
}

export function ChatCenter({ input, setInput, onSend, onSuggestion, refineBlock, onClearBlock }: ChatCenterProps) {
  return (
    <div style={{
      flex: 1,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 24px", gap: 32,
    }}>
      {/* Greeting */}
      <div style={{ textAlign: "center", maxWidth: 620, animation: "fadeUp 600ms 80ms both" }}>
        <div style={{
          fontSize: 13, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Icon name="sparkle" size={13}/> organizaTUM · Week 16
        </div>
        <div className="serif" style={{ fontSize: 52, lineHeight: 1.1, color: "var(--ink)", display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
          <span>Good afternoon, Jonas.</span>
          <span style={{ fontStyle: "italic", color: "var(--ink-2)" }}>Shall we plan your week?</span>
        </div>
        <div style={{ fontSize: 16, color: "var(--ink-3)", maxWidth: 500, margin: "0 auto", lineHeight: 1.5 }}>
          Tell me about your courses, how you like to study, and what's already fixed.
          I'll start drawing the calendar once I know enough.
        </div>
      </div>

      {/* Composer */}
      <Composer
        variant="center"
        value={input}
        onChange={setInput}
        onSend={onSend}
        placeholder="What are you taking this semester?"
        refineBlock={refineBlock}
        onClearBlock={onClearBlock}
      />

      {/* Suggestions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 640, animation: "fadeUp 600ms 240ms both" }}>
        {SUGGESTIONS.map((s) => (
          <SuggestionChip key={s} onClick={() => onSuggestion(s)}>{s}</SuggestionChip>
        ))}
      </div>
    </div>
  );
}

function SuggestionChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        padding: "8px 14px", fontSize: 13, color: "var(--ink-2)",
        background: hov ? "var(--surface)" : "var(--bg-raised)",
        border: hov ? "1px solid var(--ink-4)" : "1px solid var(--line)",
        borderRadius: 999,
        transition: "all 160ms ease",
      }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}
