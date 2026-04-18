import { StateGraph, END } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState } from "./state";
import { onboardingNode } from "./nodes/onboarding";
import { analysisNode } from "./nodes/analysis";
import { schedulingNode } from "./nodes/scheduling";
import { refinementNode } from "./nodes/refinement";
import { leisureNode } from "./nodes/leisure";
import type { AgentPhase, ChatRequest, WeeklyCalendar } from "@organizaTUM/shared";

function routeFromOnboarding(state: AgentState): string {
  return state.userProfile ? "analysis" : "onboarding";
}

function routeFromScheduling(state: AgentState): string {
  return state.refinementRequest ? "refinement" : "leisure";
}

function routeFromRefinement(state: AgentState): string {
  return state.refinementRequest ? "refinement" : "leisure";
}

const graph = new StateGraph(AgentStateAnnotation)
  .addNode("onboarding", onboardingNode)
  .addNode("analysis", analysisNode)
  .addNode("scheduling", schedulingNode)
  .addNode("refinement", refinementNode)
  .addNode("leisure", leisureNode)
  .addEdge("__start__", "onboarding")
  .addConditionalEdges("onboarding", routeFromOnboarding, ["onboarding", "analysis"])
  .addEdge("analysis", "scheduling")
  .addConditionalEdges("scheduling", routeFromScheduling, ["refinement", "leisure"])
  .addConditionalEdges("refinement", routeFromRefinement, ["refinement", "leisure"])
  .addEdge("leisure", END);

const compiledGraph = graph.compile();

export interface GraphResult {
  calendar: WeeklyCalendar | null;
  currentPhase: AgentPhase;
}

export async function runGraph(
  request: ChatRequest,
  onChunk: (chunk: string) => void,
): Promise<GraphResult> {
  const initialState: Partial<AgentState> = {
    messages: request.messages,
    userProfile: request.userProfile ?? null,
  };

  let calendar: WeeklyCalendar | null = null;
  let currentPhase: AgentPhase = "onboarding";

  const stream = compiledGraph.streamEvents(initialState, { version: "v2" });

  for await (const event of stream) {
    if (event.event === "on_chat_model_stream" && event.data?.chunk?.content) {
      onChunk(event.data.chunk.content as string);
    }

    // Capture state updates emitted by each node as it completes
    if (event.event === "on_chain_end" && event.data?.output) {
      const output = event.data.output as Partial<AgentState>;
      if (output.calendar) calendar = output.calendar;
      if (output.currentPhase) currentPhase = output.currentPhase;
    }
  }

  return { calendar, currentPhase };
}
