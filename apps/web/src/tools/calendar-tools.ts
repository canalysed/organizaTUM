import { tool } from "ai";
import { z } from "zod";
import {
  TimeBlockSchema,
  WeeklyCalendarSchema,
  DayOfWeekSchema,
  TimeSchema,
  type WeeklyCalendar,
  type TimeBlock,
} from "@organizaTUM/shared";

export function buildCalendarTools(initialCalendar: WeeklyCalendar) {
  let calendar: WeeklyCalendar = {
    ...initialCalendar,
    blocks: [...initialCalendar.blocks],
  };

  const tools = {
    listBlocks: tool({
      description:
        "List all blocks in the current calendar with their IDs, types, days, and times. Use this before making changes to find block IDs.",
      parameters: z.object({}),
      execute: async () =>
        calendar.blocks.map((b: TimeBlock) => ({
          id: b.id,
          title: b.title,
          type: b.type,
          day: b.dayOfWeek,
          start: b.startTime,
          end: b.endTime,
          isFixed: b.isFixed,
        })),
    }),

    addBlock: tool({
      description:
        "Add a new time block to the calendar. Use for study sessions, meals, breaks, or leisure activities.",
      parameters: z.object({ block: TimeBlockSchema }),
      execute: async (args) => {
        const block = args.block as TimeBlock;
        calendar = {
          ...calendar,
          blocks: [...calendar.blocks, block],
          metadata: {
            ...calendar.metadata,
            version: calendar.metadata.version + 1,
          },
        };
        return {
          ok: true,
          message: `Added "${block.title}" on ${block.dayOfWeek} at ${block.startTime}–${block.endTime}`,
        };
      },
    }),

    removeBlock: tool({
      description:
        "Remove a non-fixed block from the calendar by its ID. Cannot remove lectures (isFixed = true).",
      parameters: z.object({
        blockId: z.string().describe("ID of the block to remove"),
      }),
      execute: async (args) => {
        const blockId = args.blockId as string;
        const block = calendar.blocks.find((b: TimeBlock) => b.id === blockId);
        if (!block) return { ok: false, message: `Block "${blockId}" not found` };
        if (block.isFixed)
          return {
            ok: false,
            message: `"${block.title}" is a fixed lecture and cannot be removed`,
          };
        calendar = {
          ...calendar,
          blocks: calendar.blocks.filter((b: TimeBlock) => b.id !== blockId),
          metadata: {
            ...calendar.metadata,
            version: calendar.metadata.version + 1,
          },
        };
        return { ok: true, message: `Removed "${block.title}"` };
      },
    }),

    moveBlock: tool({
      description:
        "Move a non-fixed block to a different day and/or time. Cannot move fixed blocks (lectures).",
      parameters: z.object({
        blockId: z.string().describe("ID of the block to move"),
        newDay: DayOfWeekSchema,
        newStartTime: TimeSchema,
        newEndTime: TimeSchema,
      }),
      execute: async (args) => {
        const blockId = args.blockId as string;
        const newDay = args.newDay as TimeBlock["dayOfWeek"];
        const newStartTime = args.newStartTime as string;
        const newEndTime = args.newEndTime as string;
        const block = calendar.blocks.find((b: TimeBlock) => b.id === blockId);
        if (!block) return { ok: false, message: `Block "${blockId}" not found` };
        if (block.isFixed)
          return { ok: false, message: `"${block.title}" is fixed and cannot be moved` };
        calendar = {
          ...calendar,
          blocks: calendar.blocks.map((b: TimeBlock) =>
            b.id === blockId
              ? { ...b, dayOfWeek: newDay, startTime: newStartTime, endTime: newEndTime }
              : b,
          ),
          metadata: {
            ...calendar.metadata,
            version: calendar.metadata.version + 1,
          },
        };
        return {
          ok: true,
          message: `Moved "${block.title}" to ${newDay} ${newStartTime}–${newEndTime}`,
        };
      },
    }),

    replaceCalendar: tool({
      description:
        "Replace the entire calendar with a completely new schedule. Use only for global restructuring requests.",
      parameters: z.object({ calendar: WeeklyCalendarSchema }),
      execute: async (args) => {
        calendar = args.calendar as WeeklyCalendar;
        return { ok: true, message: "Calendar fully replaced with new schedule" };
      },
    }),
  };

  return { tools, getCalendar: () => calendar };
}
