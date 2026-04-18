"use client";

import { useState } from "react";
import type { TimeBlock } from "@organizaTUM/shared";
import { useUserStore } from "@/stores/user-store";
import { Composer } from "./Composer";

function getGreeting(): string {
  return "Hello";
}

interface ChatCenterProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onSuggestion: (s: string) => void;
  refineBlock?: TimeBlock | null;
  onClearBlock?: () => void;
  onViewCalendar: () => void;
}

export function ChatCenter({ input, setInput, onSend, refineBlock, onClearBlock, onViewCalendar }: ChatCenterProps) {
  const identity = useUserStore((s) => s.identity);
  const firstName = identity?.fullName?.trim().split(" ")[0] ?? identity?.tumEmail?.split("@")[0] ?? null;
  const greeting = getGreeting();

  return (
    <div style={{
      flex: 1,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 24px",
      gap: 24,
    }}>
      {/* Heading */}
      <div style={{ textAlign: "center", width: "100%", maxWidth: 600, animation: "fadeUp 600ms 80ms both" }}>
        <div className="serif" style={{ fontSize: 46, lineHeight: 1.12, display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          <span style={{ color: "var(--ink)" }}>
            {greeting}{firstName ? `, ${firstName}` : ""}!
          </span>
          <span style={{ fontStyle: "italic", color: "var(--tum)", opacity: 0.9 }}>
            Shall we plan your week?
          </span>
        </div>
        <div style={{ fontSize: 15.5, color: "var(--ink-3)", maxWidth: 460, margin: "0 auto", lineHeight: 1.55 }}>
          Tell me about your courses, how you like to study, and what's already fixed.
        </div>
      </div>

      {/* Composer */}
      <div style={{ width: "100%", maxWidth: 640, animation: "fadeUp 600ms 160ms both" }}>
        <Composer
          variant="center"
          value={input}
          onChange={setInput}
          onSend={onSend}
          placeholder="What are you taking this semester?"
          refineBlock={refineBlock}
          onClearBlock={onClearBlock}
        />
      </div>

      {/* Calendar shortcut */}
      <div style={{ animation: "fadeUp 600ms 240ms both" }}>
        <ViewCalendarButton onClick={onViewCalendar}/>
      </div>
    </div>
  );
}

function ViewCalendarButton({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 13, fontWeight: 500,
        color: hov ? "#fff" : "var(--tum)",
        padding: "8px 18px", borderRadius: 999,
        border: "1.5px solid var(--tum)",
        background: hov ? "var(--tum)" : "var(--tum-soft)",
        cursor: "pointer",
        transition: "all 150ms ease",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      Open Calendar
    </button>
  );
}

