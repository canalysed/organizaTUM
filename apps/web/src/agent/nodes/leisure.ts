import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/bedrock-client";
import { leisurePrompt } from "@/prompts/leisure";
import { getTumEvents } from "@/tools/tum-events";
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

  const events = await getTumEvents();

  const result = await generateObject({
    model,
    schema: LeisureSuggestionsSchema,
    messages: [
      {
        role: "system",
        content: leisurePrompt(state.userProfile, state.calendar, events),
      },
    ],
  });

  return {
    currentPhase: "done",
    messages: [{ role: "assistant", content: result.object.message }],
  };
}
