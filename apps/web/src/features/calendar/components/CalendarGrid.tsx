"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import type { WeeklyCalendar, TimeBlock, BlockType, DayOfWeek } from "@organizaTUM/shared";
import { Icon } from "@/components/Icon";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_NAMES = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;
const HOUR_START = 8;
const HOUR_END = 23;
const WEEKEND_START = 5;
const LUNCH_START = 12;
const LUNCH_END = 13;

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

interface CalendarBlock {
  id: string; day: number; start: number; end: number;
  kind: "lecture" | "exercise" | "study" | "meal" | "leisure" | "break";
  title: string; where?: string; date?: string;
  dishes?: MealItem[];
}
interface LayoutBlock extends CalendarBlock { col: number; numCols: number; }
interface BlockDraft { id: string; day: number; start: number; end: number; }

interface MealItem { name: string; price?: number; }
interface SidebarState { calBlock: CalendarBlock; orig?: TimeBlock; }
interface CreateModalState { day: number; start: number; end: number; }

interface CalendarGridProps {
  calendar: WeeklyCalendar | null;
  isLoading?: boolean;
  density: Density;
  blockStyle: BlockStyle;
  onBlockClick: (block: TimeBlock) => void;
  onBlockMove?: (blockId: string, newDay: number, newStart: number, newEnd: number) => void;
  selectedId: string | null;
  buildProgress: number;
  onImportCsv?: () => void;
  selectedCanteenId?: string | null;
  onCanteenChange?: (id: string | null) => void;
  onAddBlock?: (block: TimeBlock) => void;
  onDeleteBlock?: (blockId: string) => void;
  onUpdateBlock?: (blockId: string, updates: Partial<TimeBlock>) => void;
}

export const KIND_META: Record<string, { label: string; color: string; bg: string }> = {
  lecture:  { label: "Lecture",  color: "var(--lecture)",  bg: "var(--lecture-bg)"  },
  exercise: { label: "Übung",    color: "var(--exercise)", bg: "var(--exercise-bg)" },
  study:    { label: "Study",    color: "var(--study)",    bg: "var(--study-bg)"    },
  meal:     { label: "Meal",     color: "var(--meal)",     bg: "var(--meal-bg)"     },
  leisure:  { label: "Leisure",  color: "var(--leisure)",  bg: "var(--leisure-bg)"  },
  break:    { label: "Break",    color: "var(--break)",    bg: "var(--break-bg)"    },
};

const KIND_TO_TYPE: Record<string, BlockType> = {
  lecture: "lecture", exercise: "exercise", study: "study",
  meal: "meal", leisure: "leisure", break: "break",
};

const DAY_MAP: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};
const TYPE_TO_KIND: Record<string, CalendarBlock["kind"]> = {
  lecture: "lecture", uebung: "exercise", exercise: "exercise",
  study: "study", meal: "meal", leisure: "leisure", break: "break", commitment: "exercise",
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
      kind: (TYPE_TO_KIND[b.type] ?? "study") as CalendarBlock["kind"],
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
    if (b.start >= maxEnd) { clusters.push(current); current = [b]; maxEnd = b.end; }
    else { current.push(b); maxEnd = Math.max(maxEnd, b.end); }
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
  { kind: "block-move"; blockId: string; origDay: number; origStart: number; origEnd: number; startClientX: number; startClientY: number; hourPx: number; hasMoved: boolean };

const inputSt: React.CSSProperties = {
  padding: "7px 10px", fontSize: 13, color: "var(--ink)",
  background: "var(--surface)", border: "1px solid var(--line)",
  borderRadius: 7, outline: "none", fontFamily: "inherit", width: "100%",
};

export function CalendarGrid({
  calendar, isLoading = false, density, blockStyle,
  onBlockClick, onBlockMove, selectedId,
  buildProgress, onImportCsv,
  selectedCanteenId, onCanteenChange,
  onAddBlock, onDeleteBlock, onUpdateBlock,
}: CalendarGridProps) {
  const hours = HOUR_END - HOUR_START;

  const gridBodyRef = useRef<HTMLDivElement>(null);
  const [dynamicHourPx, setDynamicHourPx] = useState(0);
  const hourPx = dynamicHourPx > 0 ? dynamicHourPx : (density === "compact" ? 44 : 62);
  const totalHeight = hourPx * hours;

  useLayoutEffect(() => {
    const el = gridBodyRef.current;
    if (!el) return;
    const measure = () => { const h = el.clientHeight; if (h > 0) setDynamicHourPx(h / hours); };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [hours]);

  const [weekOffset, setWeekOffset] = useState(0);
  const monday = getWeekMonday(weekOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d.getDate();
  });
  const weekNum = getISOWeek(monday);
  const dateRange = formatDateRange(monday);

  const todayDow = new Date().getDay();
  const todayIdx = weekOffset === 0 ? (todayDow === 0 ? 6 : todayDow - 1) : -1;
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
  const nowTop = (nowHour - HOUR_START) * hourPx;

  const blocks = calendar ? toCalendarBlocks(calendar) : [];
  const visibleCount = Math.ceil(blocks.length * buildProgress);

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
        id: `meal-day${dayIdx}`, day: dayIdx,
        start: LUNCH_START, end: LUNCH_END,
        kind: "meal" as const,
        title: "Lunch",
        where: `${meals.length} dishes available`,
        dishes: meals,
      }];
    }),
  [weekMeals]);

  const mealBlocksRef = useRef(mealBlocks);
  useEffect(() => { mealBlocksRef.current = mealBlocks; }, [mealBlocks]);

  const [sidebarState, setSidebarState] = useState<SidebarState | null>(null);
  const [createModal, setCreateModal] = useState<CreateModalState | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const onBlockMoveRef = useRef(onBlockMove);
  useEffect(() => { onBlockMoveRef.current = onBlockMove; }, [onBlockMove]);
  const totalHRef = useRef(totalHeight);
  useEffect(() => { totalHRef.current = totalHeight; }, [totalHeight]);
  const hourPxRef = useRef(hourPx);
  useEffect(() => { hourPxRef.current = hourPx; }, [hourPx]);

  const blocksRef = useRef(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  const allBlocksRef = useRef<CalendarBlock[]>([]);
  useEffect(() => { allBlocksRef.current = [...blocksRef.current, ...mealBlocksRef.current]; }, [blocks, mealBlocks]);
  const calendarRef = useRef(calendar);
  useEffect(() => { calendarRef.current = calendar; }, [calendar]);

  const [draftBlock, setDraftBlock] = useState<BlockDraft | null>(null);
  const draftBlockRef = useRef<BlockDraft | null>(null);
  useEffect(() => { draftBlockRef.current = draftBlock; }, [draftBlock]);

  const [cursorOverride, setCursorOverride] = useState<string>("");
  const dayColRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null));

  const snap = (h: number) => Math.round(h * 4) / 4;

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
      if (!d.hasMoved) {
        const dist = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
        if (dist > 5) {
          d.hasMoved = true;
          setCursorOverride("grabbing");
          const init: BlockDraft = { id: d.blockId, day: d.origDay, start: d.origStart, end: d.origEnd };
          draftBlockRef.current = init;
          setDraftBlock(init);
        } else return;
      }
      const deltaH = (e.clientY - d.startClientY) / d.hourPx;
      const duration = d.origEnd - d.origStart;
      const ns = snap(Math.max(HOUR_START, Math.min(HOUR_END - duration, d.origStart + deltaH)));
      const draft: BlockDraft = { id: d.blockId, day: getDayFromX(e.clientX), start: ns, end: ns + duration };
      draftBlockRef.current = draft;
      setDraftBlock({ ...draft });
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.hasMoved) {
        const block = allBlocksRef.current.find(b => b.id === d.blockId);
        const orig = calendarRef.current?.blocks.find(tb => tb.id === d.blockId);
        if (block) setSidebarState({ calBlock: block, orig });
      } else {
        const draft = draftBlockRef.current;
        if (draft) onBlockMoveRef.current?.(draft.id, draft.day, draft.start, draft.end);
      }
      setDraftBlock(null); draftBlockRef.current = null;
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-raised)", borderRadius: 14, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)", position: "relative" }}>
      {cursorOverride && <style>{`* { cursor: ${cursorOverride} !important; }`}</style>}

      {/* ── Calendar header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 10px", borderBottom: "1px solid var(--line-soft)", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div className="serif" style={{ fontSize: 21, lineHeight: 1, color: "var(--ink)" }}>{dateRange}</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.05em", textTransform: "uppercase" }}>W{weekNum} · SoSe 2026</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* Mensa selector */}
          {onCanteenChange && (
            <select
              value={selectedCanteenId ?? ""}
              onChange={(e) => onCanteenChange(e.target.value || null)}
              style={{
                fontSize: 11.5, color: selectedCanteenId ? "var(--ink-2)" : "var(--ink-3)",
                padding: "5px 8px", borderRadius: 6,
                border: "1px solid var(--line)",
                background: selectedCanteenId ? "color-mix(in oklab, var(--meal-bg) 80%, var(--bg-raised))" : "var(--surface)",
                cursor: "pointer", outline: "none", fontFamily: "inherit",
                transition: "all 120ms ease",
              }}
            >
              <option value="">🍽 Mensa off</option>
              <option value="mensa-garching">Mensa Garching</option>
              <option value="mensa-lothstr">Mensa Lothstraße</option>
              <option value="mensa-arcisstr">Mensa Arcisstr.</option>
              <option value="mensa-leopoldstr">Mensa Leopoldstr.</option>
              <option value="mensa-martinsried">Mensa Martinsried</option>
              <option value="mensa-weihenstephan">Mensa Weihenstephan</option>
              <option value="mensa-pasing">Mensa Pasing</option>
            </select>
          )}
          {onImportCsv && (
            <button
              onClick={onImportCsv}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11.5, color: "var(--tum)",
                padding: "5px 10px", borderRadius: 6,
                border: "1px solid var(--tum-line)",
                background: "var(--tum-soft)",
                cursor: "pointer", transition: "all 120ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "color-mix(in oklab, var(--tum) 12%, var(--bg-raised))"; }}
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
          {onAddBlock && (
            <button
              onClick={() => setCreateModal({ day: todayIdx >= 0 ? todayIdx : 0, start: 10, end: 11 })}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11.5, color: "var(--ink-2)",
                padding: "5px 10px", borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                cursor: "pointer", transition: "all 120ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New block
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

      {/* ── Day headers row ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ borderRight: "1px solid var(--line-soft)" }}/>
        {ALL_DAYS.map((d, i) => {
          const isWeekend = i >= WEEKEND_START;
          const isToday = i === todayIdx;
          return (
            <div key={d} style={{
              background: isWeekend ? "color-mix(in oklab, var(--bg-sunken) 55%, var(--bg-raised))" : "var(--bg-raised)",
              borderLeft: "1px solid var(--line-soft)",
              padding: "8px 8px 6px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <div style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, color: isToday ? "var(--tum)" : isWeekend ? "var(--ink-4)" : "var(--ink-3)" }}>{d}</div>
              <div className="serif" style={{
                fontSize: 15, fontWeight: 500, lineHeight: 1,
                width: 26, height: 26, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isToday ? "var(--tum)" : "transparent",
                color: isToday ? "#fff" : isWeekend ? "var(--ink-3)" : "var(--ink-2)",
                transition: "background 200ms ease",
              }}>{weekDates[i]}</div>
            </div>
          );
        })}
      </div>

      {/* ── Grid body ───────────────────────────────────────────────────── */}
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
                const blockDate = new Date(b.date + "T00:00:00");
                const dayDiff = Math.round((blockDate.getTime() - monday.getTime()) / 86400000);
                return dayDiff >= 0 && dayDiff < 7;
              }
              return true;
            });
            const dayMealBlocks = !isWeekend ? mealBlocks.filter(b => b.day === dayIdx) : [];
            const dayBlocks = [...calendarDayBlocks, ...dayMealBlocks];
            const layout = computeLayout(dayBlocks);
            return (
              <div
                key={dayIdx}
                ref={el => { dayColRefs.current[dayIdx] = el; }}
                style={{
                  position: "relative", borderLeft: "1px solid var(--line-soft)",
                  height: totalHeight,
                  background: isWeekend ? "color-mix(in oklab, var(--bg-sunken) 22%, transparent)" : "transparent",
                }}
              >
                {/* Hour grid lines */}
                {Array.from({ length: hours }).map((_, i) => (
                  <span key={i}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: i * hourPx, borderTop: "1px solid color-mix(in oklab, var(--line-soft) 65%, transparent)", pointerEvents: "none" }}/>
                    <div style={{ position: "absolute", left: 0, right: 0, top: i * hourPx + hourPx / 2, borderTop: "1px dotted color-mix(in oklab, var(--line-soft) 35%, transparent)", pointerEvents: "none" }}/>
                  </span>
                ))}

                {/* Skeleton loaders */}
                {isLoading && !calendar && SKELETON_SCHEDULE.filter(s => s.day === dayIdx).map((s, i) => (
                  <div key={i} className="cal-skeleton" style={{
                    position: "absolute", top: (s.start - HOUR_START) * hourPx + 2,
                    height: (s.end - s.start) * hourPx - 4, left: 4, right: 4,
                    opacity: s.dim ? 0.45 : 0.7, animationDelay: `${i * 180}ms`, zIndex: 1,
                  }}/>
                ))}

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
                  const isSelected = selectedId === b.id || sidebarState?.calBlock.id === b.id;

                  return (
                    <div key={b.id} data-block="">
                      <Block
                        b={b} blockStyle={blockStyle}
                        top={top} height={height} col={col} numCols={numCols}
                        selected={isSelected} delayIdx={delayIdx}
                        isDragging={!!draft}
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

        {/* Block sidebar */}
        {sidebarState && (
          <BlockSidebar
            calBlock={sidebarState.calBlock}
            orig={sidebarState.orig}
            onClose={() => setSidebarState(null)}
            onRequestChange={(block) => { onBlockClick(block); setSidebarState(null); }}
            onUpdate={(id, updates) => { onUpdateBlock?.(id, updates); setSidebarState(null); }}
            onDelete={(id) => { onDeleteBlock?.(id); setSidebarState(null); }}
          />
        )}
      </div>

      {/* Create block modal */}
      {createModal && (
        <CreateBlockModal
          initialDay={createModal.day}
          initialStart={createModal.start}
          initialEnd={createModal.end}
          onSubmit={(block) => { onAddBlock?.(block); setCreateModal(null); }}
          onCancel={() => setCreateModal(null)}
        />
      )}
    </div>
  );
}

/* ── Block component ──────────────────────────────────────────────────────── */

function Block({
  b, blockStyle, top, height, col, numCols,
  selected, delayIdx, isDragging, onStartDrag,
}: {
  b: CalendarBlock; blockStyle: BlockStyle;
  top: number; height: number; col: number; numCols: number;
  selected: boolean; delayIdx: number; isDragging?: boolean;
  onStartDrag: (e: React.PointerEvent) => void;
}) {
  const [hov, setHov] = useState(false);
  const meta = KIND_META[b.kind];
  const compact = height < 44;
  const veryCompact = height < 22;
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
        height: Math.max(height - 4, 16),
        left: `calc(${(col / numCols) * 100}% + ${GAP}px)`,
        width: `calc(${(1 / numCols) * 100}% - ${GAP * 2}px)`,
        background: bg,
        border: `1px solid ${borderCol}`,
        ...(accentBar ? { borderLeft: `3px solid ${accentBar}` } : {}),
        borderRadius: 7,
        padding: veryCompact ? "1px 5px" : compact ? "3px 6px" : "5px 8px",
        boxShadow: isDragging
          ? "0 10px 32px color-mix(in oklab, var(--ink) 22%, transparent)"
          : selected
            ? `0 0 0 2px ${meta.color}`
            : "0 1px 2px color-mix(in oklab, var(--ink) 5%, transparent)",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.88 : 1,
        overflow: "hidden",
        display: "flex", flexDirection: "column", gap: 1,
        animation: `blockIn 380ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delayIdx * 20}ms both`,
        transform: isDragging ? "scale(1.025) translateZ(0)" : hov ? "translateY(-1px)" : "none",
        transition: isDragging ? "none" : "transform 100ms ease, box-shadow 100ms ease",
        zIndex: isDragging ? 12 : 4,
        userSelect: "none", touchAction: "none",
      }}
      onPointerDown={e => { e.stopPropagation(); onStartDrag(e); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Type label — hidden in very compact */}
      {!veryCompact && !compact && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: 1.5, background: meta.color, flexShrink: 0 }}/>
          <span style={{ fontSize: 9, color: meta.color, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, lineHeight: 1 }}>{meta.label}</span>
        </div>
      )}
      {/* Title — always visible */}
      <div style={{
        fontSize: veryCompact ? 10 : compact ? 11 : 12,
        fontWeight: 600, color: "var(--ink)", lineHeight: 1.2,
        overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>{b.title}</div>
      {/* Time — only in non-compact */}
      {!compact && (
        <div style={{ fontSize: 10, color: "var(--ink-3)", lineHeight: 1.3, marginTop: 1 }}>
          {formatT(b.start)} – {formatT(b.end)}
        </div>
      )}
    </div>
  );
}

/* ── Block sidebar ────────────────────────────────────────────────────────── */

function BlockSidebar({ calBlock, orig, onClose, onRequestChange, onUpdate, onDelete }: {
  calBlock: CalendarBlock;
  orig?: TimeBlock;
  onClose: () => void;
  onRequestChange: (block: TimeBlock) => void;
  onUpdate: (blockId: string, updates: Partial<TimeBlock>) => void;
  onDelete: (blockId: string) => void;
}) {
  const [title, setTitle] = useState(calBlock.title);
  const [kind, setKind] = useState(calBlock.kind);
  const [location, setLocation] = useState(calBlock.where ?? "");
  const [startStr, setStartStr] = useState(formatT(calBlock.start));
  const [endStr, setEndStr] = useState(formatT(calBlock.end));
  const [day, setDay] = useState(calBlock.day);

  const meta = KIND_META[kind] ?? KIND_META.study;
  const isDirty = title !== calBlock.title || kind !== calBlock.kind ||
    location !== (calBlock.where ?? "") || startStr !== formatT(calBlock.start) ||
    endStr !== formatT(calBlock.end) || day !== calBlock.day;

  const handleSave = () => {
    onUpdate(calBlock.id, {
      title,
      type: (KIND_TO_TYPE[kind] ?? "study") as BlockType,
      location: location.trim() || undefined,
      dayOfWeek: DAY_NAMES[day] as DayOfWeek,
      startTime: startStr,
      endTime: endStr,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{
      position: "absolute", right: 0, top: 0, bottom: 0, width: 268,
      background: "var(--bg-raised)",
      borderLeft: "1px solid var(--line)",
      zIndex: 20, display: "flex", flexDirection: "column",
      animation: "slideInRight 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      boxShadow: "-4px 0 16px color-mix(in oklab, var(--ink) 8%, transparent)",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, flexShrink: 0 }}/>
          <select
            value={kind}
            onChange={e => setKind(e.target.value as CalendarBlock["kind"])}
            style={{ fontSize: 12, fontWeight: 600, color: meta.color, background: "transparent", border: "none", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            {Object.entries(KIND_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
        <button onClick={onClose} style={{ color: "var(--ink-3)", display: "flex", padding: 4, borderRadius: 6 }} aria-label="Close">
          <Icon name="close" size={14}/>
        </button>
      </div>

      {/* Body */}
      <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <SidebarField label="Title">
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputSt}/>
        </SidebarField>

        <SidebarField label="Day">
          <select value={day} onChange={e => setDay(Number(e.target.value))} style={{ ...inputSt, appearance: "none" }}>
            {ALL_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </SidebarField>

        <SidebarField label="Time">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="time" value={startStr} onChange={e => setStartStr(e.target.value)} style={{ ...inputSt, flex: 1 }}/>
            <span style={{ color: "var(--ink-4)", fontSize: 12 }}>–</span>
            <input type="time" value={endStr} onChange={e => setEndStr(e.target.value)} style={{ ...inputSt, flex: 1 }}/>
          </div>
        </SidebarField>

        <SidebarField label="Location">
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Room, building…" style={inputSt}/>
        </SidebarField>

        {calBlock.kind === "meal" && calBlock.dishes && calBlock.dishes.length > 0 && (
          <SidebarField label="Today's menu">
            <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "var(--surface)", borderRadius: 7, border: "1px solid var(--line)", overflow: "hidden" }}>
              {calBlock.dishes.map((d, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  padding: "7px 10px",
                  borderTop: i > 0 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 12, color: "var(--ink-2)",
                }}>
                  <span style={{ flex: 1, lineHeight: 1.35 }}>{d.name}</span>
                  {d.price != null && (
                    <span style={{ color: "var(--ink-4)", marginLeft: 8, flexShrink: 0, fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>€{d.price.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </SidebarField>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {isDirty && (
          <button
            onClick={handleSave}
            style={{ padding: "8px 12px", borderRadius: 7, background: "var(--tum)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "background 120ms ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "color-mix(in oklab, var(--tum) 80%, black)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--tum)"; }}
          >Save changes</button>
        )}
        {orig && (
          <button
            onClick={() => onRequestChange(orig)}
            style={{ padding: "8px 12px", borderRadius: 7, background: "var(--surface)", border: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink-2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 100ms ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; }}
          >
            <Icon name="refresh" size={12}/> Modify with AI
          </button>
        )}
        <button
          onClick={() => onDelete(calBlock.id)}
          style={{ padding: "8px 12px", borderRadius: 7, background: "transparent", border: "1px solid color-mix(in oklab, oklch(50% 0.15 25) 40%, var(--line))", fontSize: 12.5, color: "oklch(50% 0.15 25)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 100ms ease" }}
          onMouseEnter={e => { e.currentTarget.style.background = "oklch(97% 0.03 25)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <Icon name="trash" size={12}/> Delete block
        </button>
      </div>
    </div>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

/* ── Create Block Modal ───────────────────────────────────────────────────── */

function CreateBlockModal({ initialDay, initialStart, initialEnd, onSubmit, onCancel }: {
  initialDay: number;
  initialStart: number;
  initialEnd: number;
  onSubmit: (block: TimeBlock) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<CalendarBlock["kind"]>("study");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [day, setDay] = useState(initialDay);
  const [startStr, setStartStr] = useState(formatT(initialStart));
  const [endStr, setEndStr] = useState(formatT(initialEnd));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const block: TimeBlock = {
      id: crypto.randomUUID(),
      type: (KIND_TO_TYPE[kind] ?? "study") as BlockType,
      title: title.trim(),
      dayOfWeek: DAY_NAMES[day] as DayOfWeek,
      startTime: startStr,
      endTime: endStr,
      location: location.trim() || undefined,
      isFixed: false,
    };
    onSubmit(block);
  };

  const meta = KIND_META[kind];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ width: "100%", maxWidth: 380, background: "var(--bg-raised)", borderRadius: 14, border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", overflow: "hidden", animation: "fadeUp 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, flexShrink: 0 }}/>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>New block</span>
            </div>
            <button type="button" onClick={onCancel} style={{ color: "var(--ink-3)", display: "flex", padding: 4, borderRadius: 6 }} aria-label="Close">
              <Icon name="close" size={14}/>
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "16px 16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
            <SidebarField label="Type">
              <select value={kind} onChange={e => setKind(e.target.value as CalendarBlock["kind"])} style={{ ...inputSt, appearance: "none" }}>
                {Object.entries(KIND_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </SidebarField>

            <SidebarField label="Title">
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Linear Algebra lecture" style={inputSt} autoFocus/>
            </SidebarField>

            <SidebarField label="Day">
              <select value={day} onChange={e => setDay(Number(e.target.value))} style={{ ...inputSt, appearance: "none" }}>
                {ALL_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </SidebarField>

            <SidebarField label="Time">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="time" value={startStr} onChange={e => setStartStr(e.target.value)} style={{ ...inputSt, flex: 1 }}/>
                <span style={{ color: "var(--ink-4)", fontSize: 12 }}>–</span>
                <input type="time" value={endStr} onChange={e => setEndStr(e.target.value)} style={{ ...inputSt, flex: 1 }}/>
              </div>
            </SidebarField>

            <SidebarField label="Location (optional)">
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Room or building…" style={inputSt}/>
            </SidebarField>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
            <button
              type="button" onClick={onCancel}
              style={{ flex: 1, padding: "9px 14px", fontSize: 13.5, color: "var(--ink-3)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
            >Cancel</button>
            <button
              type="submit"
              style={{ flex: 2, padding: "9px 14px", fontSize: 13.5, fontWeight: 500, color: "#fff", background: "var(--tum)", border: "none", borderRadius: 8, cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.background = "color-mix(in oklab, var(--tum) 80%, black)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--tum)"; }}
            >Create block</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NavBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-2)", cursor: "pointer" }}
      aria-label={label} onClick={onClick}
    >
      {children}
    </button>
  );
}
