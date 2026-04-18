import type { WeeklyCalendar, TimeBlock, CalendarUpdate } from "@organizaTUM/shared";

export function applyUpdate(
  calendar: WeeklyCalendar,
  update: CalendarUpdate,
): WeeklyCalendar {
  return {
    ...calendar,
    blocks: calendar.blocks.map((block) =>
      block.id === update.blockId ? { ...block, ...update.updates } : block,
    ),
    metadata: {
      ...calendar.metadata,
      version: calendar.metadata.version + 1,
    },
  };
}

export function hasOverlaps(blocks: TimeBlock[]): boolean {
  const sorted = [...blocks].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek.localeCompare(b.dayOfWeek);
    return a.startTime.localeCompare(b.startTime);
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.dayOfWeek === b.dayOfWeek && a.endTime > b.startTime) return true;
  }
  return false;
}
