import { generateObject } from "ai";
import { model } from "@/lib/bedrock-client";
import { WeeklyCalendarSchema } from "@organizaTUM/shared";
import { schedulingPrompt } from "@/prompts/scheduling";
import { getMensaMenu } from "@/tools/mensa-menu";
import type { AgentState } from "../state";

export async function schedulingNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.userProfile || !state.courseAnalysis) return {};

  const mensaMenu = await getMensaMenu();

  const result = await generateObject({
    model,
    schema: WeeklyCalendarSchema,
    messages: [
      {
        role: "system",
        content: schedulingPrompt(state.userProfile, state.courseAnalysis, mensaMenu),
      },
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
