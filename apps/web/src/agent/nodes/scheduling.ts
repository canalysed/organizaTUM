import { generateObject } from "ai";
import { getModel } from "@/lib/bedrock-client";
import { WeeklyCalendarSchema } from "@organizaTUM/shared";
import { schedulingPrompt } from "@/prompts/scheduling";
import { getMensaMenu } from "@/tools/mensa-menu";
import { emitThinking } from "../stream-context";
import type { AgentState } from "../state";

export async function schedulingNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.userProfile || !state.courseAnalysis) return {};

  emitThinking("Fetching mensa menu...");
  const mensaMenu = await getMensaMenu();

  emitThinking("Generating your schedule...");
  const result = await generateObject({
    model: getModel(),
    mode: "tool",
    schema: WeeklyCalendarSchema,
    messages: [
      {
        role: "system",
        content: schedulingPrompt(state.userProfile, state.courseAnalysis, mensaMenu, state.userNotes),
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
