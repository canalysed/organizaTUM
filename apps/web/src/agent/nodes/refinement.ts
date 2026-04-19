import { generateText } from "ai";
import { getModel } from "@/lib/bedrock-client";
import { buildCalendarTools } from "@/tools/calendar-tools";
import {
  refinementProposePrompt,
  refinementApplyPrompt,
  refinementRejectedPrompt,
} from "@/prompts/refinement";
import { emitThinking } from "../stream-context";
import type { AgentState } from "../state";

const TOOL_LABELS: Record<string, string> = {
  listBlocks: "Reading current schedule...",
  addBlock: "Adding a new block...",
  removeBlock: "Removing a block...",
  moveBlock: "Moving a block...",
  replaceCalendar: "Restructuring your week...",
};

export async function refinementNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.calendar || !state.refinementRequest) return {};

  const mode = state.refinementMode ?? "propose";

  // User rejected the proposal — ask what they want instead (no tools needed)
  if (mode === "rejected") {
    emitThinking("Checking your feedback...");
    const result = await generateText({
      model: getModel(),
      messages: [
        { role: "system", content: refinementRejectedPrompt() },
        { role: "user", content: state.refinementRequest.message },
      ],
    });
    return {
      refinementRequest: null,
      currentPhase: "refinement",
      messages: [
        {
          role: "assistant",
          content: result.text || "No problem! What would you like instead?",
        },
      ],
    };
  }

  // Apply mode — student confirmed, now actually run the tools
  if (mode === "apply" && state.lastAssistantMessage) {
    emitThinking("Applying your changes...");
    const { tools, getCalendar } = buildCalendarTools(state.calendar);

    const result = await generateText({
      model: getModel(),
      tools,
      maxSteps: 8,
      messages: [
        {
          role: "system",
          content: refinementApplyPrompt(state.calendar, state.lastAssistantMessage),
        },
        { role: "assistant", content: state.lastAssistantMessage },
        { role: "user", content: "Yes, please apply these changes." },
      ],
      onStepFinish: ({ toolCalls }) => {
        for (const tc of toolCalls) {
          emitThinking(TOOL_LABELS[tc.toolName] ?? `Using ${tc.toolName}...`);
        }
      },
    });

    return {
      calendar: getCalendar(),
      refinementRequest: null,
      currentPhase: "refinement",
      messages: [
        {
          role: "assistant",
          content: result.text || "Done! Your schedule has been updated.",
        },
      ],
    };
  }

  // Propose mode — describe what would change and ask for confirmation (no calendar emitted yet)
  emitThinking("Analyzing your request...");
  const result = await generateText({
    model: getModel(),
    messages: [
      {
        role: "system",
        content: refinementProposePrompt(state.calendar, state.refinementRequest),
      },
      { role: "user", content: state.refinementRequest.message },
    ],
  });

  const proposalText =
    result.text ||
    "I can make those changes for you. Shall I apply them?";

  return {
    // Do NOT emit calendar yet — waiting for confirmation
    refinementRequest: null,
    currentPhase: "refinement",
    messages: [{ role: "assistant", content: proposalText }],
  };
}
