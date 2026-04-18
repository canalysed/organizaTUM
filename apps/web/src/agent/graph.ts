import { StateGraph, END } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState } from "./state";
import { onboardingNode } from "./nodes/onboarding";
import { analysisNode } from "./nodes/analysis";
import { schedulingNode } from "./nodes/scheduling";
import { refinementNode } from "./nodes/refinement";
import { leisureNode } from "./nodes/leisure";
import type { AgentPhase, ChatRequest, CourseAnalysis, UserProfile, UserNote, WeeklyCalendar } from "@organizaTUM/shared";

function routeFromOnboarding(state: AgentState): string {
  if (!state.userProfile) return "onboarding";
  // Skip analysis if cached results already exist
  return state.courseAnalysis ? "scheduling" : "analysis";
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
  userProfile: UserProfile | null;
  courseAnalysis: CourseAnalysis[] | null;
}

export async function runGraph(
  request: ChatRequest & { userNotes?: UserNote[]; courseAnalysis?: CourseAnalysis[] },
  onChunk: (chunk: string) => void,
): Promise<GraphResult> {
  const initialState: Partial<AgentState> = {
    messages: request.messages,
    userProfile: request.userProfile ?? null,
    userNotes: request.userNotes ?? [],
    courseAnalysis: request.courseAnalysis ?? null,
  };

  let calendar: WeeklyCalendar | null = null;
  let currentPhase: AgentPhase = "onboarding";
  let userProfile: UserProfile | null = request.userProfile ?? null;
  let courseAnalysis: CourseAnalysis[] | null = request.courseAnalysis ?? null;

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
      if (output.userProfile) userProfile = output.userProfile;
      if (output.courseAnalysis) courseAnalysis = output.courseAnalysis;
    }
  }

  return { calendar, currentPhase, userProfile, courseAnalysis };
}
