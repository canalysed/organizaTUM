import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/bedrock-client";
import { leisurePrompt } from "@/prompts/leisure";
import { getTumEvents } from "@/tools/tum-events";
import { emitThinking } from "../stream-context";
import type { AgentState } from "../state";

const LeisureSuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      blockId: z.string(),
      activity: z.string(),
      description: z.string(),
    }),
  ),
  message: z.string(),
});

export async function leisureNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.calendar || !state.userProfile) return {};

  emitThinking("Fetching TUM events...");
  const events = await getTumEvents();

  emitThinking("Curating activity suggestions...");
  const result = await generateObject({
    model: getModel(),
    mode: "tool",
    schema: LeisureSuggestionsSchema,
    messages: [
      {
        role: "system",
        content: leisurePrompt(state.userProfile, state.calendar, events),
      },
      { role: "user", content: "Suggest leisure activities for my free time blocks." },
    ],
  });

  return {
    currentPhase: "done",
    messages: [{ role: "assistant", content: result.object.message }],
  };
}
