import { generateObject } from "ai";
import { model } from "@/lib/bedrock-client";
import { OnboardingResponseSchema } from "@organizaTUM/shared";
import { onboardingPrompt } from "@/prompts/onboarding";
import type { AgentState } from "../state";

export async function onboardingNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  const result = await generateObject({
    model,
    schema: OnboardingResponseSchema,
    messages: [
      { role: "system", content: onboardingPrompt() },
      ...state.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  const response = result.object;

  return {
    messages: [{ role: "assistant", content: response.message }],
    currentPhase: response.isComplete ? "analysis" : "onboarding",
    userProfile: response.isComplete
      ? (response.profileSoFar as AgentState["userProfile"])
      : null,
  };
}
