"use client";

import { useRef, useEffect, useState } from "react";
import type { TimeBlock } from "@organizaTUM/shared";
import { Icon } from "@/components/Icon";
import { type SelectionSlot } from "@/features/calendar/components/CalendarGrid";

interface ComposerProps {
  variant: "center" | "float" | "sidebar";
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  refineBlock?: TimeBlock | null;
  onClearBlock?: () => void;
  selection?: SelectionSlot[];
  onClearSelection?: () => void;
}

const KIND_COLORS: Record<string, string> = {
  lecture: "var(--lecture)", exercise: "var(--exercise)", uebung: "var(--exercise)",
  study: "var(--study)", meal: "var(--meal)", leisure: "var(--leisure)", break: "var(--break)",
};

function formatHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function Composer({
  variant, value, onChange, onSend, disabled, placeholder,
  refineBlock, onClearBlock, selection, onClearSelection,
}: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; kind: string }>>([]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 180) + "px";
    }
  }, [value]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && (value.trim() || attachments.length)) {
        onSend();
        setAttachments([]);
      }
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).map((f) => ({
      name: f.name,
      kind: f.type.startsWith("image/") ? "image" : "file",
    }));
    setAttachments((prev) => [...prev, ...list]);
  };

  const wrapStyle: React.CSSProperties =
    variant === "center"
      ? { width: "100%", maxWidth: 640, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: 14, display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 600ms 160ms both" }
      : variant === "float"
      ? { width: "100%", maxWidth: 720, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow-md)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }
      : { margin: "10px 14px 14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: 10, display: "flex", flexDirection: "column", gap: 8 };

  const empty = !value.trim() && !attachments.length;

  return (
    <div style={wrapStyle}>
      {/* Block context chip */}
      {refineBlock && (
        <div style={{ margin: "0 2px 0", padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--ink-2)", animation: "fadeUp 180ms both" }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: KIND_COLORS[refineBlock.type] ?? "var(--ink-3)" }}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Refining · {refineBlock.type}
            </div>
            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {refineBlock.title} · {refineBlock.dayOfWeek} {refineBlock.startTime}
            </div>
          </div>
          <span style={{ marginLeft: "auto", color: "var(--ink-4)", cursor: "pointer", padding: 2, borderRadius: 4, display: "flex", alignItems: "center" }} onClick={onClearBlock}>
            <Icon name="close" size={12}/>
          </span>
        </div>
      )}

      {/* Selection context chip */}
      {!refineBlock && selection && selection.length > 0 && (
        <div style={{ margin: "0 2px 0", padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--ink-2)", animation: "fadeUp 180ms both" }}>
          <span style={{ width: 7, height: 7, borderRadius: 3, flexShrink: 0, background: "var(--ink)" }}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Selected time
            </div>
            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selection.length} slot{selection.length === 1 ? "" : "s"} · {Math.round(selection.reduce((s, x) => s + (x.end - x.start) * 60, 0))} min total
            </div>
          </div>
          <span style={{ marginLeft: "auto", color: "var(--ink-4)", cursor: "pointer", padding: 2, borderRadius: 4, display: "flex", alignItems: "center" }} onClick={onClearSelection}>
            <Icon name="close" size={12}/>
          </span>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 2px 4px" }}>
          {attachments.map((a, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", fontSize: 11.5, color: "var(--ink-2)", background: "var(--bg-sunken)", border: "1px solid var(--line-soft)", borderRadius: 6, fontFamily: "var(--font-mono, monospace)" }}>
              <Icon name={a.kind === "image" ? "sparkle" : "book"} size={11}/>
              {a.name.length > 24 ? a.name.slice(0, 21) + "..." : a.name}
              <span style={{ color: "var(--ink-4)", cursor: "pointer", display: "flex" }}
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                <Icon name="close" size={10}/>
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={taRef}
        style={{ resize: "none", border: "none", outline: "none", background: "transparent", fontSize: 15, lineHeight: 1.5, padding: "6px 6px", minHeight: 24, color: "var(--ink)", fontFamily: "inherit" }}
        rows={1}
        placeholder={placeholder ?? "Tell me about your week at TUM..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
      />

      {/* Bottom row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}/>
          <AttachBtn onClick={() => fileRef.current?.click()} label="Attach file"><Icon name="plus" size={15}/></AttachBtn>
          <AttachBtn onClick={() => fileRef.current?.click()} label="Screenshot"><Icon name="grid" size={14}/></AttachBtn>
        </div>
        <SendBtn disabled={!!disabled || empty} onClick={() => { onSend(); setAttachments([]); }}/>
      </div>
    </div>
  );
}

function SendBtn({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const active = !disabled;
  return (
    <button
      style={{
        width: 34, height: 34, borderRadius: 9,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: disabled
          ? "var(--bg-sunken)"
          : hov
          ? "color-mix(in oklab, var(--tum) 80%, black)"
          : "var(--tum)",
        color: disabled ? "var(--ink-4)" : "#fff",
        transition: "background 140ms ease",
        transform: active && hov ? "scale(1.06)" : "scale(1)",
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label="Send"
    >
      <Icon name="arrowRight" size={15}/>
    </button>
  );
}

function AttachBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: hov ? "var(--ink-2)" : "var(--ink-3)", background: hov ? "var(--bg-sunken)" : "transparent", transition: "background 120ms ease, color 120ms ease" }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={label}
    >
      {children}
    </button>
  );
}
