import { generateObject } from "ai";
import { getModel } from "@/lib/bedrock-client";
import { OnboardingResponseSchema } from "@organizaTUM/shared";
import { onboardingPrompt } from "@/prompts/onboarding";
import type { AgentState } from "../state";

export async function onboardingNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  const result = await generateObject({
    model: getModel(),
    mode: "tool",
    schema: OnboardingResponseSchema,
    messages: [
      {
        role: "system",
        content: onboardingPrompt(
          state.identityName ?? undefined,
          state.userProfile,
        ),
      },
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
