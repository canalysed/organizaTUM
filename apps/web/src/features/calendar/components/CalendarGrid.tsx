"use client";

import { useState, useRef, useEffect } from "react";
import type { WeeklyCalendar, TimeBlock } from "@organizaTUM/shared";
import { Icon } from "@/components/Icon";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_NUMS = [20, 21, 22, 23, 24];
const TODAY_IDX = 2;
const HOUR_START = 8;
const HOUR_END = 20;
const EDGE_PX = 8; // px from top/bottom edge that acts as resize handle

type Density = "compact" | "roomy";
type BlockStyle = "muted" | "mono" | "accent";

export interface SelectionSlot {
  id: string;
  day: number;
  start: number; // float hours
  end: number;
}

export const SLOT_COLORS = [
  { bg: "oklch(93% 0.07 250)", border: "oklch(58% 0.20 250)", dot: "oklch(50% 0.22 250)" },
  { bg: "oklch(93% 0.07 25)",  border: "oklch(58% 0.20 25)",  dot: "oklch(50% 0.22 25)"  },
  { bg: "oklch(93% 0.07 145)", border: "oklch(58% 0.20 145)", dot: "oklch(50% 0.22 145)" },
  { bg: "oklch(93% 0.07 300)", border: "oklch(58% 0.20 300)", dot: "oklch(50% 0.22 300)" },
  { bg: "oklch(93% 0.07 55)",  border: "oklch(58% 0.20 55)",  dot: "oklch(50% 0.22 55)"  },
];

interface CalendarBlock {
  id: string; day: number; start: number; end: number;
  kind: "lecture" | "exercise" | "study" | "meal" | "leisure" | "break";
  title: string; where?: string;
}

interface CalendarGridProps {
  calendar: WeeklyCalendar | null;
  density: Density;
  blockStyle: BlockStyle;
  onBlockClick: (block: TimeBlock) => void;
  selectedId: string | null;
  buildProgress: number;
  selection: SelectionSlot[];
  onSelectionChange: (s: SelectionSlot[]) => void;
}

const KIND_META: Record<string, { label: string; color: string; bg: string }> = {
  lecture:  { label: "Lecture",  color: "var(--lecture)",  bg: "var(--lecture-bg)"  },
  exercise: { label: "Übung",    color: "var(--exercise)", bg: "var(--exercise-bg)" },
  study:    { label: "Study",    color: "var(--study)",    bg: "var(--study-bg)"    },
  meal:     { label: "Meal",     color: "var(--meal)",     bg: "var(--meal-bg)"     },
  leisure:  { label: "Leisure",  color: "var(--leisure)",  bg: "var(--leisure-bg)"  },
  break:    { label: "Break",    color: "var(--break)",    bg: "var(--break-bg)"    },
};

const DAY_MAP: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4,
};
const TYPE_TO_KIND: Record<string, CalendarBlock["kind"]> = {
  lecture: "lecture", uebung: "exercise", exercise: "exercise",
  study: "study", meal: "meal", leisure: "leisure", break: "break", commitment: "break",
};

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
function formatT(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function toCalendarBlocks(cal: WeeklyCalendar): CalendarBlock[] {
  return cal.blocks
    .filter((b) => DAY_MAP[b.dayOfWeek] !== undefined)
    .map((b) => ({
      id: b.id, day: DAY_MAP[b.dayOfWeek],
      start: parseTime(b.startTime), end: parseTime(b.endTime),
      kind: (TYPE_TO_KIND[b.type] ?? "break") as CalendarBlock["kind"],
      title: b.title, where: b.location,
    }));
}

// ─── Drag state types ──────────────────────────────────────────────────────

type DragState =
  | { kind: "new"; day: number; colTop: number; startY: number; endY: number }
  | { kind: "move" | "resize-top" | "resize-bottom"; slotId: string; day: number; origStart: number; origEnd: number; startClientY: number; hourPx: number };

// ─── Component ────────────────────────────────────────────────────────────

export function CalendarGrid({
  calendar, density, blockStyle,
  onBlockClick, selectedId,
  buildProgress, selection, onSelectionChange,
}: CalendarGridProps) {
  const hourPx = density === "compact" ? 44 : 62;
  const hours = HOUR_END - HOUR_START;
  const totalHeight = hours * hourPx;
  const nowHour = 14 + 35 / 60;
  const nowTop = (nowHour - HOUR_START) * hourPx;

  const blocks = calendar ? toCalendarBlocks(calendar) : [];
  const visibleCount = Math.ceil(blocks.length * buildProgress);

  // Drag refs (never go stale in document listeners)
  const dragRef = useRef<DragState | null>(null);
  const selectionRef = useRef(selection);
  useEffect(() => { selectionRef.current = selection; }, [selection]);
  const onChangeRef = useRef(onSelectionChange);
  useEffect(() => { onChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  const totalHRef = useRef(totalHeight);
  useEffect(() => { totalHRef.current = totalHeight; }, [totalHeight]);
  const hourPxRef = useRef(hourPx);
  useEffect(() => { hourPxRef.current = hourPx; }, [hourPx]);

  // Visual state
  const [liveDrag, setLiveDrag] = useState<{ day: number; startY: number; endY: number } | null>(null);
  const [draftSlot, setDraftSlot] = useState<SelectionSlot | null>(null);
  const draftSlotRef = useRef<SelectionSlot | null>(null);
  useEffect(() => { draftSlotRef.current = draftSlot; }, [draftSlot]);

  const [cursorOverride, setCursorOverride] = useState<string>("");
  const dayColRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  const snap = (h: number) => Math.round(h * 4) / 4; // 15-min
  const yToHour = (y: number) => HOUR_START + Math.max(0, Math.min(hours, y / hourPxRef.current));

  // ── Document-level listeners (registered once) ────────────────────────

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      if (d.kind === "new") {
        const y = e.clientY - d.colTop;
        const clamped = Math.max(0, Math.min(totalHRef.current, y));
        dragRef.current = { ...d, endY: clamped };
        setLiveDrag({ day: d.day, startY: d.startY, endY: clamped });
        return;
      }

      // move / resize
      const deltaH = (e.clientY - d.startClientY) / d.hourPx;
      const duration = d.origEnd - d.origStart;
      let ns = d.origStart, ne = d.origEnd;

      if (d.kind === "move") {
        ns = snap(Math.max(HOUR_START, Math.min(HOUR_END - duration, d.origStart + deltaH)));
        ne = ns + duration;
      } else if (d.kind === "resize-top") {
        ns = snap(Math.max(HOUR_START, Math.min(d.origEnd - 0.25, d.origStart + deltaH)));
      } else if (d.kind === "resize-bottom") {
        ne = snap(Math.max(d.origStart + 0.25, Math.min(HOUR_END, d.origEnd + deltaH)));
      }

      const draft: SelectionSlot = { id: d.slotId, day: d.day, start: ns, end: ne };
      draftSlotRef.current = draft;
      setDraftSlot(draft);
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;

      if (d.kind === "new") {
        const top = Math.min(d.startY, d.endY);
        const bot = Math.max(d.startY, d.endY);
        if (bot - top >= 10) {
          const sh = snap(yToHour(top));
          const eh = snap(yToHour(bot));
          if (eh - sh >= 0.25) {
            const newSlot: SelectionSlot = { id: Math.random().toString(36).slice(2), day: d.day, start: sh, end: eh };
            onChangeRef.current([...selectionRef.current, newSlot]);
          }
        }
        setLiveDrag(null);
      } else {
        const draft = draftSlotRef.current;
        if (draft) {
          onChangeRef.current(selectionRef.current.map((s) => (s.id === draft.id ? draft : s)));
        }
        setDraftSlot(null);
        draftSlotRef.current = null;
      }

      dragRef.current = null;
      setCursorOverride("");
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []); // intentionally empty — all reads go through refs

  // ── Interaction handlers ──────────────────────────────────────────────

  const startNewDrag = (dayIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    const colEl = dayColRefs.current[dayIdx];
    if (!colEl) return;
    const rect = colEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    dragRef.current = { kind: "new", day: dayIdx, colTop: rect.top, startY: y, endY: y };
    setLiveDrag({ day: dayIdx, startY: y, endY: y });
    setCursorOverride("crosshair");
  };

  const startSelectionDrag = (
    e: React.MouseEvent,
    slot: SelectionSlot,
    kind: "move" | "resize-top" | "resize-bottom",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      kind, slotId: slot.id, day: slot.day,
      origStart: slot.start, origEnd: slot.end,
      startClientY: e.clientY, hourPx: hourPxRef.current,
    };
    setDraftSlot({ ...slot });
    draftSlotRef.current = { ...slot };
    setCursorOverride(kind === "move" ? "grabbing" : "ns-resize");
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-raised)", borderRadius: 14, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      {cursorOverride && <style>{`* { cursor: ${cursorOverride} !important; }`}</style>}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <div className="serif" style={{ fontSize: 26, lineHeight: 1, color: "var(--ink)" }}>April 20 ‒ 24</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Week 16 · Summer Term</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-2)" }}>Today</button>
          <NavBtn label="Previous week"><Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }}/></NavBtn>
          <NavBtn label="Next week"><Icon name="chevron" size={14}/></NavBtn>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, padding: "8px 22px", borderBottom: "1px solid var(--line-soft)", fontSize: 11.5, color: "var(--ink-3)" }}>
        {(["lecture", "exercise", "study", "meal", "leisure"] as const).map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: KIND_META[k].color }}/>
            <span>{KIND_META[k].label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="scroll" style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(5, 1fr)", minHeight: "100%" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-raised)", borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line-soft)" }}/>

          {DAYS.map((d, i) => (
            <div key={d} style={{ position: "sticky", top: 0, zIndex: 2, background: i === TODAY_IDX ? "var(--bg-sunken)" : "var(--bg-raised)", borderBottom: "1px solid var(--line)", padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{d}</div>
              <div className="serif" style={{ fontSize: 18, color: i === TODAY_IDX ? "var(--ink)" : "var(--ink-2)" }}>{DAY_NUMS[i]}</div>
            </div>
          ))}

          {/* Hour labels */}
          <div style={{ borderRight: "1px solid var(--line-soft)", position: "relative", height: totalHeight }}>
            {Array.from({ length: hours + 1 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", top: i * hourPx, right: 8, fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)", transform: "translateY(-50%)" }}>
                {String(HOUR_START + i).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((_, dayIdx) => {
            const dayBlocks = blocks.filter((b) => b.day === dayIdx);
            const daySel = selection.filter((s) => s.day === dayIdx);
            const ld = liveDrag && liveDrag.day === dayIdx ? liveDrag : null;

            return (
              <div
                key={dayIdx}
                ref={(el) => { dayColRefs.current[dayIdx] = el; }}
                style={{ position: "relative", borderRight: "1px solid var(--line-soft)", height: totalHeight, cursor: "crosshair" }}
                onMouseDown={(e) => {
                  // Only start a new drag if the click is not on a selection handle or block
                  if ((e.target as HTMLElement).closest("[data-sel-handle],[data-block],[data-del-btn]")) return;
                  startNewDrag(dayIdx, e);
                }}
              >
                {/* Grid lines */}
                {Array.from({ length: hours }).map((_, i) => (
                  <span key={i}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: i * hourPx, borderTop: "1px dashed var(--line-soft)" }}/>
                    <div style={{ position: "absolute", left: 0, right: 0, top: i * hourPx + hourPx / 2, borderTop: "1px dotted var(--line-soft)", opacity: 0.5 }}/>
                  </span>
                ))}
                <div style={{ position: "absolute", left: 0, right: 0, top: hours * hourPx, borderTop: "1px dashed var(--line-soft)" }}/>

                {/* Selection overlays */}
                {daySel.map((slot) => {
                  const displayed = draftSlot?.id === slot.id ? draftSlot : slot;
                  const colorIdx = selection.findIndex((s) => s.id === slot.id) % SLOT_COLORS.length;
                  const c = SLOT_COLORS[colorIdx];
                  const top = (displayed.start - HOUR_START) * hourPx;
                  const h = (displayed.end - displayed.start) * hourPx;
                  const hasBody = h > 2 * EDGE_PX;
                  const isDraft = draftSlot?.id === slot.id;

                  return (
                    <div
                      key={slot.id}
                      style={{ position: "absolute", left: 4, right: 4, top: top + 2, height: h - 4, background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 8, zIndex: 1, overflow: "hidden", opacity: isDraft ? 0.85 : 1 }}
                    >
                      {/* Top resize handle */}
                      <div
                        data-sel-handle=""
                        style={{ position: "absolute", top: 0, left: 0, right: 0, height: hasBody ? EDGE_PX : "50%", cursor: "ns-resize", zIndex: 2 }}
                        onMouseDown={(e) => startSelectionDrag(e, slot, "resize-top")}
                      />

                      {/* Body (move) — only when tall enough */}
                      {hasBody && (
                        <div
                          data-sel-handle=""
                          style={{ position: "absolute", top: EDGE_PX, left: 0, right: 0, bottom: EDGE_PX, cursor: "grab", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "2px 5px" }}
                          onMouseDown={(e) => startSelectionDrag(e, slot, "move")}
                        >
                          <span style={{ fontSize: 10, color: c.dot, fontFamily: "var(--font-mono, monospace)", lineHeight: 1.4, userSelect: "none", pointerEvents: "none" }}>
                            {formatT(displayed.start)}<br/>{formatT(displayed.end)}
                          </span>
                          {/* Delete button */}
                          <button
                            data-del-btn=""
                            style={{ width: 16, height: 16, borderRadius: 4, background: c.border, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onSelectionChange(selection.filter((s) => s.id !== slot.id)); }}
                            aria-label="Remove"
                          >
                            <Icon name="close" size={9}/>
                          </button>
                        </div>
                      )}

                      {/* Delete button for short slots (no body) */}
                      {!hasBody && (
                        <button
                          data-del-btn=""
                          style={{ position: "absolute", top: 2, right: 4, width: 14, height: 14, borderRadius: 3, background: c.border, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 3 }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); onSelectionChange(selection.filter((s) => s.id !== slot.id)); }}
                          aria-label="Remove"
                        >
                          <Icon name="close" size={8}/>
                        </button>
                      )}

                      {/* Bottom resize handle */}
                      <div
                        data-sel-handle=""
                        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: hasBody ? EDGE_PX : "50%", cursor: "ns-resize", zIndex: 2 }}
                        onMouseDown={(e) => startSelectionDrag(e, slot, "resize-bottom")}
                      />
                    </div>
                  );
                })}

                {/* Live drag preview (new selection) */}
                {ld && (
                  <div style={{ position: "absolute", left: 4, right: 4, top: Math.min(ld.startY, ld.endY), height: Math.abs(ld.endY - ld.startY), background: "color-mix(in oklab, var(--ink) 10%, transparent)", border: "1.5px dashed var(--ink)", borderRadius: 8, pointerEvents: "none", zIndex: 2 }}/>
                )}

                {/* Calendar blocks */}
                {dayBlocks.map((b) => {
                  const globalIdx = blocks.indexOf(b);
                  if (globalIdx >= visibleCount) return null;
                  const top = (b.start - HOUR_START) * hourPx;
                  const height = (b.end - b.start) * hourPx;
                  const orig = calendar?.blocks.find((tb) => tb.id === b.id) ?? null;
                  return (
                    <div key={b.id} data-block="">
                      <Block b={b} blockStyle={blockStyle} top={top} height={height} selected={selectedId === b.id} delayIdx={globalIdx} onClick={() => { if (orig) onBlockClick(orig); }}/>
                    </div>
                  );
                })}

                {/* Now line */}
                {dayIdx === TODAY_IDX && nowTop >= 0 && nowTop <= totalHeight && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: nowTop, borderTop: "1.5px solid oklch(62% 0.12 30)", zIndex: 3 }}>
                    <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "oklch(62% 0.12 30)" }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Block ────────────────────────────────────────────────────────────────

function Block({ b, blockStyle, top, height, selected, delayIdx, onClick }: {
  b: CalendarBlock; blockStyle: BlockStyle; top: number; height: number;
  selected: boolean; delayIdx: number; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const meta = KIND_META[b.kind];
  const compact = height < 44;
  const veryCompact = height < 28;

  let bg = "var(--surface)", borderCol = "var(--line)", kindCol = meta.color;
  let accentBar: string | null = null;
  if (blockStyle === "muted") { bg = meta.bg; borderCol = `color-mix(in oklab, ${meta.color} 18%, var(--line))`; }
  else if (blockStyle === "mono") { kindCol = "var(--ink-3)"; }
  else if (blockStyle === "accent") { accentBar = meta.color; }

  return (
    <div
      style={{ position: "absolute", top: top + 2, height: height - 4, left: 6, right: 6, background: bg, border: `1px solid ${borderCol}`, ...(accentBar ? { borderLeft: `3px solid ${accentBar}` } : {}), borderRadius: 8, padding: compact ? "4px 8px" : "7px 10px", boxShadow: selected ? "0 0 0 2px var(--ink)" : "var(--shadow-sm)", cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", gap: 2, animation: `blockIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delayIdx * 22}ms both`, transform: hov ? "translateY(-1px)" : "translateY(0)", transition: "transform 120ms ease, box-shadow 120ms ease", zIndex: 4 }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {!veryCompact && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: kindCol, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em" }}>
          {blockStyle !== "mono" && <span style={{ width: 6, height: 6, borderRadius: 2, background: meta.color, flexShrink: 0 }}/>}
          <span style={{ textTransform: "uppercase" }}>{meta.label}</span>
          <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>{formatT(b.start)}</span>
        </div>
      )}
      <div style={{ fontSize: compact ? 12 : 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</div>
      {!compact && b.where && <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.where}</div>}
    </div>
  );
}

function NavBtn({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-2)" }} aria-label={label}>
      {children}
    </button>
  );
}
