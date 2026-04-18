import { generateObject } from "ai";
import { model } from "@/lib/bedrock-client";
import { WeeklyCalendarSchema } from "@organizaTUM/shared";
import { refinementPrompt } from "@/prompts/refinement";
import type { AgentState } from "../state";

export async function refinementNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.calendar || !state.refinementRequest) return {};

  const result = await generateObject({
    model,
    schema: WeeklyCalendarSchema,
    messages: [
      {
        role: "system",
        content: refinementPrompt(state.calendar, state.refinementRequest),
      },
    ],
  });

  return {
    calendar: result.object,
    refinementRequest: null,
    currentPhase: "refinement",
    messages: [
      {
        role: "assistant",
        content: "Done! I've updated your schedule. Anything else you'd like to change?",
      },
    ],
  };
}
