"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import type { WeeklyCalendar, TimeBlock } from "@organizaTUM/shared";
import { Icon } from "@/components/Icon";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_NAMES = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;
const HOUR_START = 8;
const HOUR_END = 23;
const EDGE_PX = 8;
const WEEKEND_START = 5;
const LUNCH_START = 10 + 45 / 60;
const LUNCH_END = 14 + 15 / 60;

const SKELETON_SCHEDULE: Array<{ day: number; start: number; end: number; dim?: boolean }> = [
  { day: 0, start: 9,    end: 10.5 },
  { day: 0, start: 12,   end: 13,    dim: true },
  { day: 0, start: 14,   end: 16   },
  { day: 1, start: 8,    end: 9.5  },
  { day: 1, start: 10,   end: 11.5 },
  { day: 1, start: 13,   end: 13.75, dim: true },
  { day: 2, start: 9,    end: 10.5 },
  { day: 2, start: 12,   end: 13,    dim: true },
  { day: 2, start: 14,   end: 15.5 },
  { day: 3, start: 8,    end: 9.5  },
  { day: 3, start: 11,   end: 12.5 },
  { day: 3, start: 15,   end: 17   },
  { day: 4, start: 9,    end: 10.5 },
  { day: 4, start: 12,   end: 13,    dim: true },
  { day: 4, start: 13.5, end: 15   },
  { day: 5, start: 10,   end: 11.5, dim: true },
  { day: 6, start: 11,   end: 12,   dim: true },
];

type Density = "compact" | "roomy";
type BlockStyle = "muted" | "mono" | "accent";

export interface SelectionSlot {
  id: string; day: number; start: number; end: number;
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
  title: string; where?: string; date?: string;
  dishes?: MealItem[];
}
interface LayoutBlock extends CalendarBlock { col: number; numCols: number; }
interface BlockDraft { id: string; day: number; start: number; end: number; }
interface PopupState { calBlock: CalendarBlock; orig?: TimeBlock; x: number; y: number; }

interface MealItem {
  name: string;
  price?: number;
}

interface CalendarGridProps {
  calendar: WeeklyCalendar | null;
  isLoading?: boolean;
  density: Density;
  blockStyle: BlockStyle;
  onBlockClick: (block: TimeBlock) => void;
  onBlockMove?: (blockId: string, newDay: number, newStart: number, newEnd: number) => void;
  selectedId: string | null;
  buildProgress: number;
  selection: SelectionSlot[];
  onSelectionChange: (s: SelectionSlot[]) => void;
  onImportCsv?: () => void;
  selectedCanteenId?: string | null;
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
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};
const TYPE_TO_KIND: Record<string, CalendarBlock["kind"]> = {
  lecture: "lecture", uebung: "exercise", exercise: "exercise",
  study: "study", meal: "meal", leisure: "leisure", break: "break", commitment: "break",
};

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
export function formatT(h: number): string {
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
      date: b.date,
    }));
}

function getWeekMonday(offset: number): Date {
  const today = new Date();
  const dow = today.getDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + toMon + offset * 7);
  return monday;
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function formatDateRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sm = monday.toLocaleString("en", { month: "long" });
  const em = sunday.toLocaleString("en", { month: "long" });
  if (sm === em) return `${sm} ${monday.getDate()} \u2012 ${sunday.getDate()}`;
  return `${sm} ${monday.getDate()} \u2012 ${em} ${sunday.getDate()}`;
}

function computeLayout(blocks: CalendarBlock[]): LayoutBlock[] {
  if (!blocks.length) return [];
  const sorted = [...blocks].sort((a, b) => a.start !== b.start ? a.start - b.start : b.end - a.end);

  const clusters: CalendarBlock[][] = [];
  let current: CalendarBlock[] = [sorted[0]];
  let maxEnd = sorted[0].end;

  for (let i = 1; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.start >= maxEnd) {
      clusters.push(current);
      current = [b];
      maxEnd = b.end;
    } else {
      current.push(b);
      maxEnd = Math.max(maxEnd, b.end);
    }
  }
  clusters.push(current);

  const result: LayoutBlock[] = [];
  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const colAssign: number[] = [];
    for (const b of cluster) {
      let col = colEnds.findIndex(end => end <= b.start);
      if (col === -1) col = colEnds.length;
      colEnds[col] = b.end;
      colAssign.push(col);
    }
    const numCols = colEnds.length;
    cluster.forEach((b, i) => result.push({ ...b, col: colAssign[i], numCols }));
  }
  return result;
}

type DragState =
  | { kind: "new"; day: number; colTop: number; startY: number; endY: number }
  | { kind: "move" | "resize-top" | "resize-bottom"; slotId: string; day: number; origStart: number; origEnd: number; startClientY: number; hourPx: number }
  | { kind: "block-move"; blockId: string; origDay: number; origStart: number; origEnd: number; startClientX: number; startClientY: number; hourPx: number; hasMoved: boolean };

export function CalendarGrid({
  calendar, isLoading = false, density, blockStyle,
  onBlockClick, onBlockMove, selectedId,
  buildProgress, selection, onSelectionChange, onImportCsv,
  selectedCanteenId,
}: CalendarGridProps) {
  const hours = HOUR_END - HOUR_START;

  // Dynamic hourPx — measured from the grid body height so calendar is non-scrollable
  const gridBodyRef = useRef<HTMLDivElement>(null);
  const [dynamicHourPx, setDynamicHourPx] = useState(0);
  const hourPx = dynamicHourPx > 0 ? dynamicHourPx : (density === "compact" ? 44 : 62);
  const totalHeight = hourPx * hours;

  useLayoutEffect(() => {
    const el = gridBodyRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setDynamicHourPx(h / hours);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [hours]);

  const [weekOffset, setWeekOffset] = useState(0);
  const monday = getWeekMonday(weekOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });
  const weekNum = getISOWeek(monday);
  const dateRange = formatDateRange(monday);

  const todayDow = new Date().getDay();
  const todayIdx = weekOffset === 0 ? (todayDow === 0 ? 6 : todayDow - 1) : -1;
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
  const nowTop = (nowHour - HOUR_START) * hourPx;

  const blocks = calendar ? toCalendarBlocks(calendar) : [];
  const visibleCount = Math.ceil(blocks.length * buildProgress);

  // Resting: block dims when selection is active and block doesn't overlap any slot
  const isResting = (b: CalendarBlock): boolean => {
    if (!selection.length) return false;
    return !selection.some(s => s.day === b.day && s.start < b.end && s.end > b.start);
  };

  const [weekMeals, setWeekMeals] = useState<Record<number, MealItem[]>>({});
  useEffect(() => {
    if (!selectedCanteenId) { setWeekMeals({}); return; }
    const year = monday.getFullYear();
    const week = getISOWeek(monday);
    let cancelled = false;
    fetch(`/api/mensa?canteenId=${encodeURIComponent(selectedCanteenId)}&year=${year}&week=${week}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { days?: Array<{ date: string; dishes?: Array<{ name: string; prices?: { students?: { base_price: number; price_per_unit: number; unit: string } | number } }> }> } | null) => {
        if (cancelled || !data?.days) return;
        const meals: Record<number, MealItem[]> = {};
        for (const day of data.days) {
          const dow = new Date(day.date + "T00:00:00").getDay();
          const idx = dow === 0 ? 6 : dow - 1;
          if (idx < 5 && day.dishes?.length) {
            meals[idx] = day.dishes.map((d) => {
              const s = d.prices?.students;
              const price = typeof s === "number" ? s : (s as { base_price?: number } | undefined)?.base_price;
              return { name: d.name, price: price ?? undefined };
            });
          }
        }
        setWeekMeals(meals);
      })
      .catch(() => { if (!cancelled) setWeekMeals({}); });
    return () => { cancelled = true; };
  }, [selectedCanteenId, weekOffset]);

  const mealBlocks = useMemo<CalendarBlock[]>(() =>
    Object.entries(weekMeals).flatMap(([dayStr, meals]) => {
      if (!meals.length) return [];
      const dayIdx = parseInt(dayStr);
      return [{
        id: `meal-day${dayIdx}`,
        day: dayIdx,
        start: LUNCH_START,
        end: LUNCH_END,
        kind: "meal" as const,
        title: meals[0].name,
        where: `${meals.length} dishes`,
        dishes: meals,
      }];
    }),
  [weekMeals]);

  const mealBlocksRef = useRef(mealBlocks);
  useEffect(() => { mealBlocksRef.current = mealBlocks; }, [mealBlocks]);

  const [popup, setPopup] = useState<PopupState | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const selectionRef = useRef(selection);
  useEffect(() => { selectionRef.current = selection; }, [selection]);
  const onChangeRef = useRef(onSelectionChange);
  useEffect(() => { onChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  const onBlockMoveRef = useRef(onBlockMove);
  useEffect(() => { onBlockMoveRef.current = onBlockMove; }, [onBlockMove]);
  const totalHRef = useRef(totalHeight);
  useEffect(() => { totalHRef.current = totalHeight; }, [totalHeight]);
  const hourPxRef = useRef(hourPx);
  useEffect(() => { hourPxRef.current = hourPx; }, [hourPx]);

  const blocksRef = useRef(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  // allBlocksRef includes meal blocks so click-popup works for mensa events
  const allBlocksRef = useRef<CalendarBlock[]>([]);
  useEffect(() => { allBlocksRef.current = [...blocksRef.current, ...mealBlocksRef.current]; }, [blocks, mealBlocks]);
  const calendarRef = useRef(calendar);
  useEffect(() => { calendarRef.current = calendar; }, [calendar]);

  const [liveDrag, setLiveDrag] = useState<{ day: number; startY: number; endY: number } | null>(null);
  const [draftSlot, setDraftSlot] = useState<SelectionSlot | null>(null);
  const draftSlotRef = useRef<SelectionSlot | null>(null);
  useEffect(() => { draftSlotRef.current = draftSlot; }, [draftSlot]);

  const [draftBlock, setDraftBlock] = useState<BlockDraft | null>(null);
  const draftBlockRef = useRef<BlockDraft | null>(null);
  useEffect(() => { draftBlockRef.current = draftBlock; }, [draftBlock]);

  const [cursorOverride, setCursorOverride] = useState<string>("");
  const dayColRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null));

  const snap = (h: number) => Math.round(h * 4) / 4;
  const yToHour = (y: number) => HOUR_START + Math.max(0, Math.min(hours, y / hourPxRef.current));

  useEffect(() => {
    const getDayFromX = (clientX: number): number => {
      let best = 0, bestDist = Infinity;
      for (let i = 0; i < 7; i++) {
        const el = dayColRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) return i;
        const dist = Math.min(Math.abs(clientX - rect.left), Math.abs(clientX - rect.right));
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      return best;
    };

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      if (d.kind === "new") {
        const y = e.clientY - d.colTop;
        const clamped = Math.max(0, Math.min(totalHRef.current, y));
        dragRef.current = { ...d, endY: clamped };
        setLiveDrag({ day: d.day, startY: d.startY, endY: clamped });
        return;
      }

      if (d.kind === "block-move") {
        if (!d.hasMoved) {
          const dist = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
          if (dist > 5) {
            d.hasMoved = true;
            setCursorOverride("grabbing");
            const init: BlockDraft = { id: d.blockId, day: d.origDay, start: d.origStart, end: d.origEnd };
            draftBlockRef.current = init;
            setDraftBlock(init);
          } else {
            return;
          }
        }

        const deltaH = (e.clientY - d.startClientY) / d.hourPx;
        const duration = d.origEnd - d.origStart;
        const ns = snap(Math.max(HOUR_START, Math.min(HOUR_END - duration, d.origStart + deltaH)));
        const draft: BlockDraft = { id: d.blockId, day: getDayFromX(e.clientX), start: ns, end: ns + duration };
        draftBlockRef.current = draft;
        setDraftBlock({ ...draft });
        return;
      }

      const deltaH = (e.clientY - d.startClientY) / d.hourPx;
      const dur = d.origEnd - d.origStart;
      let ns = d.origStart, ne = d.origEnd;
      if (d.kind === "move") {
        ns = snap(Math.max(HOUR_START, Math.min(HOUR_END - dur, d.origStart + deltaH)));
        ne = ns + dur;
      } else if (d.kind === "resize-top") {
        ns = snap(Math.max(HOUR_START, Math.min(d.origEnd - 0.25, d.origStart + deltaH)));
      } else if (d.kind === "resize-bottom") {
        ne = snap(Math.max(d.origStart + 0.25, Math.min(HOUR_END, d.origEnd + deltaH)));
      }
      draftSlotRef.current = { id: d.slotId, day: d.day, start: ns, end: ne };
      setDraftSlot({ ...draftSlotRef.current });
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      if (d.kind === "new") {
        const t = Math.min(d.startY, d.endY), bot = Math.max(d.startY, d.endY);
        if (bot - t >= 10) {
          const sh = snap(yToHour(t)), eh = snap(yToHour(bot));
          if (eh - sh >= 0.25) onChangeRef.current([...selectionRef.current, { id: Math.random().toString(36).slice(2), day: d.day, start: sh, end: eh }]);
        }
        setLiveDrag(null);
      } else if (d.kind === "block-move") {
        if (!d.hasMoved) {
          const block = allBlocksRef.current.find(b => b.id === d.blockId);
          const orig = calendarRef.current?.blocks.find(tb => tb.id === d.blockId);
          if (block) {
            setPopup({ calBlock: block, orig, x: e.clientX, y: e.clientY });
          }
        } else {
          const draft = draftBlockRef.current;
          if (draft) onBlockMoveRef.current?.(draft.id, draft.day, draft.start, draft.end);
        }
        setDraftBlock(null); draftBlockRef.current = null;
      } else {
        const draft = draftSlotRef.current;
        if (draft) onChangeRef.current(selectionRef.current.map(s => s.id === draft.id ? draft : s));
        setDraftSlot(null); draftSlotRef.current = null;
      }
      dragRef.current = null;
      setCursorOverride("");
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const startNewDrag = (dayIdx: number, e: React.PointerEvent<HTMLDivElement>) => {
    const colEl = dayColRefs.current[dayIdx];
    if (!colEl) return;
    const rect = colEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    dragRef.current = { kind: "new", day: dayIdx, colTop: rect.top, startY: y, endY: y };
    setLiveDrag({ day: dayIdx, startY: y, endY: y });
    setCursorOverride("crosshair");
  };

  const startSelectionDrag = (e: React.PointerEvent, slot: SelectionSlot, kind: "move" | "resize-top" | "resize-bottom") => {
    e.stopPropagation();
    dragRef.current = { kind, slotId: slot.id, day: slot.day, origStart: slot.start, origEnd: slot.end, startClientY: e.clientY, hourPx: hourPxRef.current };
    setDraftSlot({ ...slot }); draftSlotRef.current = { ...slot };
    setCursorOverride(kind === "move" ? "grabbing" : "ns-resize");
  };

  const startBlockDrag = (e: React.PointerEvent, block: CalendarBlock) => {
    e.stopPropagation();
    dragRef.current = {
      kind: "block-move",
      blockId: block.id,
      origDay: block.day,
      origStart: block.start,
      origEnd: block.end,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hourPx: hourPxRef.current,
      hasMoved: false
    };
  };

  const gridCols = "56px repeat(7, 1fr)";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-raised)", borderRadius: 14, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      {cursorOverride && <style>{`* { cursor: ${cursorOverride} !important; }`}</style>}

      {/* ── Calendar header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 10px", borderBottom: "1px solid var(--line-soft)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div className="serif" style={{ fontSize: 21, lineHeight: 1, color: "var(--ink)" }}>{dateRange}</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.05em", textTransform: "uppercase" }}>W{weekNum} · SoSe 2026</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {onImportCsv && (
            <button
              onClick={onImportCsv}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11.5, color: "var(--tum)",
                padding: "5px 10px", borderRadius: 6,
                border: "1px solid var(--tum-line)",
                background: "var(--tum-soft)",
                cursor: "pointer",
                transition: "all 120ms ease",
                marginRight: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "color-mix(in oklab, var(--tum) 12%, white)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--tum-soft)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import CSV
            </button>
          )}
          <button
            style={{
              fontSize: 12, padding: "4px 10px", borderRadius: 6,
              border: weekOffset === 0 ? "1px solid var(--tum)" : "1px solid var(--line)",
              background: weekOffset === 0 ? "var(--tum)" : "var(--surface)",
              color: weekOffset === 0 ? "#fff" : "var(--ink-2)",
              cursor: "pointer", transition: "all 120ms ease",
            }}
            onClick={() => setWeekOffset(0)}
          >Today</button>
          <NavBtn label="Previous week" onClick={() => setWeekOffset(o => o - 1)}><Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }}/></NavBtn>
          <NavBtn label="Next week" onClick={() => setWeekOffset(o => o + 1)}><Icon name="chevron" size={14}/></NavBtn>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, padding: "5px 16px", borderBottom: "1px solid var(--line-soft)", fontSize: 10.5, color: "var(--ink-3)", flexShrink: 0, flexWrap: "wrap" }}>
        {(["lecture", "exercise", "study", "meal", "leisure"] as const).map(k => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: KIND_META[k].color }}/>
            <span>{KIND_META[k].label}</span>
          </div>
        ))}
      </div>

      {/* ── Day headers row (outside scroll area) ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ borderRight: "1px solid var(--line-soft)" }}/>
        {ALL_DAYS.map((d, i) => {
          const isWeekend = i >= WEEKEND_START;
          const isToday = i === todayIdx;
          return (
            <div
              key={d}
              style={{
                background: isWeekend
                  ? "color-mix(in oklab, var(--bg-sunken) 55%, var(--bg-raised))"
                  : "var(--bg-raised)",
                borderLeft: "1px solid var(--line-soft)",
                padding: "8px 8px 6px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <div style={{
                fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600,
                color: isToday ? "var(--tum)" : isWeekend ? "var(--ink-4)" : "var(--ink-3)",
              }}>{d}</div>
              <div
                className="serif"
                style={{
                  fontSize: 15, fontWeight: 500, lineHeight: 1,
                  width: 26, height: 26, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? "var(--tum)" : "transparent",
                  color: isToday ? "#fff" : isWeekend ? "var(--ink-3)" : "var(--ink-2)",
                  transition: "background 200ms ease",
                }}
              >
                {weekDates[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Grid body — fills remaining height, no scroll ───────────────── */}
      <div ref={gridBodyRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, height: "100%" }}>

          {/* Time labels column */}
          <div style={{ position: "relative", borderRight: "1px solid var(--line-soft)", height: totalHeight }}>
            {Array.from({ length: hours + 1 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", top: i * hourPx, right: 7, fontSize: 9.5, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)", transform: i === 0 ? "translateY(8px)" : i === hours ? "translateY(calc(-100% - 8px))" : "translateY(-50%)", lineHeight: 1 }}>
                {String(HOUR_START + i).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {ALL_DAYS.map((_, dayIdx) => {
            const isWeekend = dayIdx >= WEEKEND_START;

            const calendarDayBlocks = blocks.filter(b => {
              const bDay = draftBlock?.id === b.id ? draftBlock.day : b.day;
              if (bDay !== dayIdx) return false;
              if (b.date) {
                // Date-specific block: only show in the week that contains this date
                const blockDate = new Date(b.date + "T00:00:00");
                const dayDiff = Math.round((blockDate.getTime() - monday.getTime()) / 86400000);
                return dayDiff >= 0 && dayDiff < 7;
              }
              return true;
            });
            const dayMealBlocks = !isWeekend ? mealBlocks.filter(b => b.day === dayIdx) : [];
            const dayBlocks = [...calendarDayBlocks, ...dayMealBlocks];
            const layout = computeLayout(dayBlocks);
            const daySel = selection.filter(s => s.day === dayIdx);
            const ld = liveDrag?.day === dayIdx ? liveDrag : null;

            return (
              <div
                key={dayIdx}
                ref={el => { dayColRefs.current[dayIdx] = el; }}
                style={{
                  position: "relative",
                  borderLeft: "1px solid var(--line-soft)",
                  height: totalHeight,
                  cursor: "crosshair",
                  background: isWeekend ? "color-mix(in oklab, var(--bg-sunken) 22%, transparent)" : "transparent",
                }}
                onPointerDown={e => {
                  if ((e.target as HTMLElement).closest("[data-sel-handle],[data-block],[data-del-btn]")) return;
                  startNewDrag(dayIdx, e);
                }}
              >
                {/* Hour grid lines */}
                {Array.from({ length: hours }).map((_, i) => (
                  <span key={i}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: i * hourPx, borderTop: "1px solid color-mix(in oklab, var(--line-soft) 65%, transparent)", pointerEvents: "none" }}/>
                    <div style={{ position: "absolute", left: 0, right: 0, top: i * hourPx + hourPx / 2, borderTop: "1px dotted color-mix(in oklab, var(--line-soft) 35%, transparent)", pointerEvents: "none" }}/>
                  </span>
                ))}

                {/* Selection slots */}
                {daySel.map(slot => {
                  const disp = draftSlot?.id === slot.id ? draftSlot : slot;
                  const c = SLOT_COLORS[selection.findIndex(s => s.id === slot.id) % SLOT_COLORS.length];
                  const top = (disp.start - HOUR_START) * hourPx;
                  const h = (disp.end - disp.start) * hourPx;
                  const hasBody = h > 2 * EDGE_PX;
                  return (
                    <div key={slot.id} style={{ position: "absolute", left: 3, right: 3, top: top + 2, height: h - 4, background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 8, zIndex: 5, overflow: "hidden", opacity: draftSlot?.id === slot.id ? 0.85 : 1 }}>
                      <div data-sel-handle="" style={{ position: "absolute", top: 0, left: 0, right: 0, height: hasBody ? EDGE_PX : "50%", cursor: "ns-resize", zIndex: 2, touchAction: "none" }} onPointerDown={e => startSelectionDrag(e, slot, "resize-top")}/>
                      {hasBody && (
                        <div data-sel-handle="" style={{ position: "absolute", top: EDGE_PX, left: 0, right: 0, bottom: EDGE_PX, cursor: "grab", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "2px 5px", touchAction: "none" }} onPointerDown={e => startSelectionDrag(e, slot, "move")}>
                          <span style={{ fontSize: 9.5, color: c.dot, fontFamily: "var(--font-mono, monospace)", lineHeight: 1.4, userSelect: "none", pointerEvents: "none" }}>{formatT(disp.start)}<br/>{formatT(disp.end)}</span>
                          <button data-del-btn="" style={{ width: 15, height: 15, borderRadius: 4, background: c.border, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onSelectionChange(selection.filter(s => s.id !== slot.id)); }} aria-label="Remove"><Icon name="close" size={8}/></button>
                        </div>
                      )}
                      {!hasBody && (
                        <button data-del-btn="" style={{ position: "absolute", top: 2, right: 3, width: 13, height: 13, borderRadius: 3, background: c.border, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 3 }} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onSelectionChange(selection.filter(s => s.id !== slot.id)); }} aria-label="Remove"><Icon name="close" size={7}/></button>
                      )}
                      <div data-sel-handle="" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: hasBody ? EDGE_PX : "50%", cursor: "ns-resize", zIndex: 2, touchAction: "none" }} onPointerDown={e => startSelectionDrag(e, slot, "resize-bottom")}/>
                    </div>
                  );
                })}

                {/* Live draw preview */}
                {ld && (
                  <div style={{ position: "absolute", left: 3, right: 3, top: Math.min(ld.startY, ld.endY), height: Math.abs(ld.endY - ld.startY), background: "color-mix(in oklab, var(--ink) 8%, transparent)", border: "1.5px dashed var(--ink-3)", borderRadius: 8, pointerEvents: "none", zIndex: 5 }}/>
                )}

                {/* Skeleton loaders */}
                {isLoading && !calendar && SKELETON_SCHEDULE
                  .filter(s => s.day === dayIdx)
                  .map((s, i) => (
                    <div
                      key={i}
                      className="cal-skeleton"
                      style={{
                        position: "absolute",
                        top: (s.start - HOUR_START) * hourPx + 2,
                        height: (s.end - s.start) * hourPx - 4,
                        left: 4, right: 4,
                        opacity: s.dim ? 0.45 : 0.7,
                        animationDelay: `${i * 180}ms`,
                        zIndex: 1,
                      }}
                    />
                  ))
                }

                {/* Calendar blocks */}
                {layout.map(b => {
                  const isMeal = b.kind === "meal";
                  if (!isMeal) {
                    const globalIdx = blocks.findIndex(bl => bl.id === b.id);
                    if (globalIdx < 0 || globalIdx >= visibleCount) return null;
                  }
                  const draft = draftBlock?.id === b.id ? draftBlock : null;
                  const dispStart = draft?.start ?? b.start;
                  const dispEnd = draft?.end ?? b.end;
                  const top = (dispStart - HOUR_START) * hourPx;
                  const height = (dispEnd - dispStart) * hourPx;
                  const col = draft ? 0 : b.col;
                  const numCols = draft ? 1 : b.numCols;
                  const delayIdx = isMeal ? 0 : blocks.findIndex(bl => bl.id === b.id);

                  return (
                    <div key={b.id} data-block="">
                      <Block
                        b={b} blockStyle={blockStyle}
                        top={top} height={height} col={col} numCols={numCols}
                        selected={selectedId === b.id} delayIdx={delayIdx}
                        isDragging={!!draft}
                        isResting={isResting(b)}
                        onStartDrag={e => startBlockDrag(e, b)}
                      />
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {dayIdx === todayIdx && nowTop >= 0 && nowTop <= totalHeight && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: nowTop, pointerEvents: "none", zIndex: 6 }}>
                    <div style={{ position: "absolute", left: -1, top: -5, width: 10, height: 10, borderRadius: "50%", background: "var(--tum)" }}/>
                    <div style={{ position: "absolute", left: 8, right: 0, top: -1, height: 2, background: "var(--tum)", borderRadius: 1 }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {popup && (
        <EventPopup
          popup={popup}
          onClose={() => setPopup(null)}
          onRefine={block => { onBlockClick(block); setPopup(null); }}
        />
      )}
    </div>
  );
}

function Block({
  b, blockStyle, top, height, col, numCols,
  selected, delayIdx, isDragging, isResting, onStartDrag,
}: {
  b: CalendarBlock; blockStyle: BlockStyle;
  top: number; height: number; col: number; numCols: number;
  selected: boolean; delayIdx: number; isDragging?: boolean;
  isResting?: boolean;
  onStartDrag: (e: React.PointerEvent) => void;
}) {
  const [hov, setHov] = useState(false);
  const meta = KIND_META[b.kind];
  const compact = height < 44;
  const veryCompact = height < 28;
  const GAP = 2;

  let bg = "var(--surface)", borderCol = "var(--line)";
  let accentBar: string | null = null;
  if (blockStyle === "muted")  { bg = meta.bg; borderCol = `color-mix(in oklab, ${meta.color} 30%, var(--line))`; }
  else if (blockStyle === "accent") { accentBar = meta.color; }

  return (
    <div
      style={{
        position: "absolute",
        top: top + 2,
        height: Math.max(height - 4, 18),
        left: `calc(${(col / numCols) * 100}% + ${GAP}px)`,
        width: `calc(${(1 / numCols) * 100}% - ${GAP * 2}px)`,
        background: bg,
        border: `1px solid ${borderCol}`,
        ...(accentBar ? { borderLeft: `3px solid ${accentBar}` } : {}),
        borderRadius: 7,
        padding: veryCompact ? "2px 6px" : compact ? "4px 7px" : "5px 8px",
        boxShadow: isDragging
          ? "0 10px 32px color-mix(in oklab, var(--ink) 22%, transparent)"
          : selected
            ? `0 0 0 2px ${meta.color}`
            : "0 1px 2px color-mix(in oklab, var(--ink) 5%, transparent)",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.88 : isResting ? 0.2 : 1,
        filter: isResting ? "grayscale(90%)" : "none",
        overflow: "hidden",
        display: "flex", flexDirection: "column", gap: 1,
        animation: `blockIn 380ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delayIdx * 20}ms both`,
        transform: isDragging ? "scale(1.025) translateZ(0)" : hov && !isResting ? "translateY(-1px)" : "none",
        transition: isDragging ? "none" : "transform 100ms ease, box-shadow 100ms ease, opacity 200ms ease, filter 200ms ease",
        zIndex: isDragging ? 12 : 4,
        userSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={e => { e.stopPropagation(); onStartDrag(e); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {!veryCompact && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: 1.5, background: meta.color, flexShrink: 0 }}/>
          <span style={{ fontSize: 9, color: meta.color, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, lineHeight: 1 }}>{meta.label}</span>
        </div>
      )}
      <div style={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: compact ? "nowrap" : "normal", display: "-webkit-box", WebkitLineClamp: compact ? 1 : 2, WebkitBoxOrient: "vertical" }}>{b.title}</div>
      {!compact && (
        <div style={{ fontSize: 10, color: "var(--ink-3)", lineHeight: 1.3, marginTop: 1 }}>
          {formatT(b.start)} – {formatT(b.end)}
          {b.where && <span style={{ marginLeft: 5, color: "var(--ink-4)" }}>· {b.where}</span>}
        </div>
      )}
      {!compact && b.dishes && b.dishes.length > 0 && (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
          {b.dishes.slice(0, Math.max(1, Math.floor((height - 52) / 18))).map((d, i) => (
            <div key={i} style={{
              fontSize: 9.5, color: "var(--ink-3)", display: "flex",
              justifyContent: "space-between", alignItems: "baseline",
              borderTop: "1px solid color-mix(in oklab, var(--line-soft) 70%, transparent)",
              paddingTop: 2, gap: 4,
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{d.name}</span>
              {d.price != null && (
                <span style={{ flexShrink: 0, fontFamily: "var(--font-mono, monospace)" }}>€{d.price.toFixed(2)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventPopup({ popup, onClose, onRefine }: {
  popup: PopupState;
  onClose: () => void;
  onRefine: (block: TimeBlock) => void;
}) {
  const meta = KIND_META[popup.calBlock.kind];
  const POPUP_W = 256;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const x = popup.x + 16 + POPUP_W > vw ? popup.x - POPUP_W - 8 : popup.x + 16;
  const y = Math.min(popup.y - 16, vh - 200);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-popup]")) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  return (
    <div
      data-popup=""
      style={{
        position: "fixed", top: y, left: x, width: POPUP_W,
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        boxShadow: "var(--shadow-lg)",
        zIndex: 1000, overflow: "hidden",
        animation: "fadeIn 120ms ease both",
      }}
    >
      <div style={{ background: meta.color, padding: "11px 12px 9px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{meta.label}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{popup.calBlock.title}</div>
        </div>
        <button onClick={onClose} style={{ color: "rgba(255,255,255,0.75)", flexShrink: 0, lineHeight: 1, padding: 2, marginTop: -1 }} aria-label="Close"><Icon name="close" size={14}/></button>
      </div>

      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-2)" }}>
          <Icon name="calendar" size={13} style={{ color: "var(--ink-3)", flexShrink: 0 }}/>
          <span>{formatT(popup.calBlock.start)} – {formatT(popup.calBlock.end)}</span>
        </div>
        {popup.calBlock.where && popup.calBlock.kind !== "meal" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-2)" }}>
            <span style={{ width: 13, height: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="globe" size={13} style={{ color: "var(--ink-3)" }}/>
            </span>
            <span>{popup.calBlock.where}</span>
          </div>
        )}
        {popup.calBlock.dishes && popup.calBlock.dishes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 2 }}>
            {popup.calBlock.dishes.map((d, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "4px 0",
                borderTop: i > 0 ? "1px solid var(--line-soft)" : "none",
                fontSize: 12, color: "var(--ink-2)",
              }}>
                <span style={{ flex: 1, lineHeight: 1.35 }}>{d.name}</span>
                {d.price != null && (
                  <span style={{ color: "var(--ink-4)", marginLeft: 8, flexShrink: 0, fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
                    €{d.price.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {popup.orig && (
          <button
            onClick={() => onRefine(popup.orig!)}
            style={{
              marginTop: 4, padding: "7px 10px", borderRadius: 7,
              background: "var(--surface)", border: "1px solid var(--line)",
              fontSize: 12, color: "var(--ink-2)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              transition: "background 100ms ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-sunken)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--surface)")}
          >
            <Icon name="refresh" size={12}/>
            <span>Request change via chat</span>
          </button>
        )}
      </div>
    </div>
  );
}

function NavBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-2)", cursor: "pointer" }}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
