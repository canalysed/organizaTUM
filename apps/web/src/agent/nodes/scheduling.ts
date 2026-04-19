import { generateObject } from "ai";
import { getModel } from "@/lib/bedrock-client";
import { WeeklyCalendarSchema } from "@organizaTUM/shared";
import type { TimeBlock } from "@organizaTUM/shared";
import { schedulingPrompt } from "@/prompts/scheduling";
import { getMensaMenu } from "@/tools/mensa-menu";
import { emitThinking } from "../stream-context";
import type { AgentState } from "../state";

// Reduce a full-semester block list to just the unique weekly patterns (one entry per
// day/time slot) so we don't blow up the prompt with 100+ dated duplicates.
function deduplicateToWeeklyPattern(blocks: TimeBlock[]): TimeBlock[] {
  const seen = new Set<string>();
  return blocks
    .filter((b) => {
      const key = `${b.dayOfWeek}|${b.startTime}|${b.endTime}|${b.courseId ?? b.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ date: _date, ...rest }) => rest as TimeBlock); // strip specific dates → repeats weekly
}

export async function schedulingNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.userProfile || !state.courseAnalysis) return {};

  emitThinking("Fetching mensa menu...");
  const mensaMenu = await getMensaMenu();

  const fixedBlocks = deduplicateToWeeklyPattern(
    state.calendar?.blocks.filter((b) => b.isFixed) ?? [],
  );

  emitThinking("Generating your schedule...");
  const result = await generateObject({
    model: getModel(),
    mode: "tool",
    schema: WeeklyCalendarSchema,
    messages: [
      {
        role: "system",
        content: schedulingPrompt(
          state.userProfile,
          state.courseAnalysis,
          mensaMenu,
          state.userNotes,
          fixedBlocks,
        ),
      },
      { role: "user", content: "Generate my personalized weekly schedule." },
    ],
  });

  return {
    calendar: result.object,
    currentPhase: "leisure",
    messages: [
      {
        role: "assistant",
        content: "Your personalized schedule is ready! Here's what I built for you this week.",
      },
    ],
  };
}
