"use client";

import type { WeeklyCalendar } from "@organizaTUM/shared";
import { useCalendarStore } from "@/stores/calendar-store";
import { BLOCK_COLORS } from "@/lib/block-colors";

interface Props {
  calendar: WeeklyCalendar;
}

// TODO: replace with FullCalendar integration
export function CalendarView({ calendar }: Props) {
  const selectBlock = useCalendarStore((s) => s.selectBlock);

  return (
    <div className="p-4 space-y-2 overflow-y-auto h-full">
      {calendar.blocks.map((block) => {
        const colors = BLOCK_COLORS[block.type];
        return (
          <button
            key={block.id}
            onClick={() => selectBlock(block)}
            className={`w-full text-left rounded-lg border px-3 py-2 transition-colors text-sm ${colors.bg} ${colors.text} ${colors.border}`}
          >
            <span className="font-medium">{block.title}</span>
            <span className="ml-2 text-xs opacity-70">
              {block.dayOfWeek} {block.startTime}–{block.endTime}
            </span>
          </button>
        );
      })}
    </div>
  );
}
