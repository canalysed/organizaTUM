import { generateText } from "ai";
import { getModel } from "@/lib/bedrock-client";
import { buildCalendarTools } from "@/tools/calendar-tools";
import { refinementPrompt } from "@/prompts/refinement";
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

  emitThinking("Working on your calendar...");
  const { tools, getCalendar } = buildCalendarTools(state.calendar);

  const result = await generateText({
    model: getModel(),
    tools,
    maxSteps: 10,
    messages: [
      {
        role: "system",
        content: refinementPrompt(
          state.calendar,
          state.refinementRequest,
          state.userProfile,
          state.identityName,
        ),
      },
      { role: "user", content: state.refinementRequest.message },
    ],
    onStepFinish: ({ toolCalls }) => {
      for (const tc of toolCalls) {
        emitThinking(TOOL_LABELS[tc.toolName] ?? `Using ${tc.toolName}...`);
      }
    },
  });

  const updatedCalendar = getCalendar();
  return {
    calendar: updatedCalendar,
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
