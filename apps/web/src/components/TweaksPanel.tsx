"use client";

import { Icon } from "./Icon";

type AppState = "landing" | "chatting" | "split";
type Density = "compact" | "roomy";
type BlockStyle = "muted" | "mono" | "accent";

interface TweaksPanelProps {
  open: boolean;
  setOpen: (o: boolean) => void;
  density: Density;
  setDensity: (d: Density) => void;
  blockStyle: BlockStyle;
  setBlockStyle: (s: BlockStyle) => void;
  appState: AppState;
  setAppState: (s: AppState) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export function TweaksPanel({
  open, setOpen,
  density, setDensity,
  blockStyle, setBlockStyle,
  appState, setAppState,
  darkMode, onToggleDark,
}: TweaksPanelProps) {
  if (!open) {
    return (
      <button
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 20,
          width: 38, height: 38, borderRadius: 10,
          background: "var(--surface)", border: "1px solid var(--line)",
          boxShadow: "var(--shadow-md)",
          color: "var(--ink-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={() => setOpen(true)}
        aria-label="Open tweaks"
      >
        <Icon name="settings" size={17}/>
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 21,
      width: 280,
      background: "var(--bg-raised)", border: "1px solid var(--line)",
      borderRadius: 14, boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px 10px",
        borderBottom: "1px solid var(--line-soft)",
      }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontFamily: "var(--font-mono, monospace)" }}>
          Tweaks
        </div>
        <button style={{ color: "var(--ink-3)", display: "flex" }} onClick={() => setOpen(false)} aria-label="Close tweaks">
          <Icon name="close" size={14}/>
        </button>
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
        <Group label="View state">
          <Seg>
            {(["landing", "chatting", "split"] as AppState[]).map((s) => (
              <SegBtn key={s} active={appState === s} onClick={() => setAppState(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SegBtn>
            ))}
          </Seg>
        </Group>

        <Group label="Calendar density">
          <Seg>
            <SegBtn active={density === "compact"} onClick={() => setDensity("compact")}>Compact</SegBtn>
            <SegBtn active={density === "roomy"}   onClick={() => setDensity("roomy")}>Roomy</SegBtn>
          </Seg>
        </Group>

        <Group label="Block style">
          <Seg>
            <SegBtn active={blockStyle === "muted"}  onClick={() => setBlockStyle("muted")}>Muted</SegBtn>
            <SegBtn active={blockStyle === "mono"}   onClick={() => setBlockStyle("mono")}>Mono</SegBtn>
            <SegBtn active={blockStyle === "accent"} onClick={() => setBlockStyle("accent")}>Accent</SegBtn>
          </Seg>
        </Group>

        <Group label="Theme">
          <Seg>
            <SegBtn active={!darkMode} onClick={() => { if (darkMode) onToggleDark(); }}>Light</SegBtn>
            <SegBtn active={darkMode}  onClick={() => { if (!darkMode) onToggleDark(); }}>Dark</SegBtn>
          </Seg>
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Seg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", background: "var(--bg-sunken)", borderRadius: 8, padding: 2, border: "1px solid var(--line-soft)" }}>
      {children}
    </div>
  );
}

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      style={{
        flex: 1, padding: "6px 8px", fontSize: 12, borderRadius: 6,
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        transition: "all 140ms ease",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
