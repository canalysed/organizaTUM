import { StateGraph, END } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState, type RefinementMode } from "./state";
import { onboardingNode } from "./nodes/onboarding";
import { analysisNode } from "./nodes/analysis";
import { schedulingNode } from "./nodes/scheduling";
import { refinementNode } from "./nodes/refinement";
import { leisureNode } from "./nodes/leisure";
import {
  runWithStreamContext,
  emitThinking,
  type AgentStreamEvent,
} from "./stream-context";
import type {
  AgentPhase,
  ChatRequest,
  CourseAnalysis,
  UserProfile,
  UserNote,
  WeeklyCalendar,
  RefinementRequest,
} from "@organizaTUM/shared";

export type { AgentStreamEvent };

function isRawCsvCalendar(calendar: WeeklyCalendar): boolean {
  const types = new Set(calendar.blocks.map((b) => b.type));
  return !types.has("study") && !types.has("meal") && !types.has("break") && !types.has("leisure");
}

function isProfileComplete(profile: UserProfile | null): boolean {
  return (profile?.courses.length ?? 0) > 0;
}

function routeFromStart(state: AgentState): string {
  if (!state.calendar) {
    // No calendar: skip onboarding if profile already complete (signup filled it in)
    return isProfileComplete(state.userProfile) ? "analysis" : "onboarding";
  }
  // Raw CSV calendar (only lectures/übungen): build the full schedule
  if (isRawCsvCalendar(state.calendar) && isProfileComplete(state.userProfile)) {
    return state.courseAnalysis ? "scheduling" : "analysis";
  }
  // Full calendar with study/meal blocks: user wants to refine
  return "refinement";
}

function routeFromOnboarding(state: AgentState): string {
  if (!state.userProfile) return END;
  return state.courseAnalysis ? "scheduling" : "analysis";
}

function routeFromScheduling(state: AgentState): string {
  return state.refinementRequest ? "refinement" : "leisure";
}

function routeFromRefinement(state: AgentState): string {
  return state.refinementRequest ? "refinement" : END;
}

const graph = new StateGraph(AgentStateAnnotation)
  .addNode("onboarding", onboardingNode)
  .addNode("analysis", analysisNode)
  .addNode("scheduling", schedulingNode)
  .addNode("refinement", refinementNode)
  .addNode("leisure", leisureNode)
  .addConditionalEdges("__start__", routeFromStart, [
    "onboarding",
    "analysis",
    "scheduling",
    "refinement",
  ])
  .addConditionalEdges("onboarding", routeFromOnboarding, ["analysis", "scheduling", END])
  .addEdge("analysis", "scheduling")
  .addConditionalEdges("scheduling", routeFromScheduling, ["refinement", "leisure"])
  .addConditionalEdges("refinement", routeFromRefinement, ["refinement", END])
  .addEdge("leisure", END);

const compiledGraph = graph.compile();

const NODE_THINKING: Record<string, string> = {
  onboarding: "Getting to know you...",
  analysis: "Analyzing your courses...",
  scheduling: "Building your weekly schedule...",
  refinement: "Working on your calendar...",
  leisure: "Finding activities for you...",
};

export interface GraphResult {
  calendar: WeeklyCalendar | null;
  currentPhase: AgentPhase;
  userProfile: UserProfile | null;
  courseAnalysis: CourseAnalysis[] | null;
  lastMessage: string | null;
}

export async function runGraph(
  request: ChatRequest & {
    userNotes?: UserNote[];
    courseAnalysis?: CourseAnalysis[];
    calendar?: WeeklyCalendar;
    refinementRequest?: RefinementRequest;
    refinementMode?: RefinementMode;
    lastAssistantMessage?: string | null;
    identityName?: string | null;
    sessionId?: string | null;
  },
  onEvent: (event: AgentStreamEvent) => void,
): Promise<GraphResult> {
  const initialState: Partial<AgentState> = {
    messages: request.messages,
    userProfile: request.userProfile ?? null,
    userNotes: request.userNotes ?? [],
    courseAnalysis: request.courseAnalysis ?? null,
    calendar: request.calendar ?? null,
    refinementRequest: request.refinementRequest ?? null,
    refinementMode: request.refinementMode ?? "propose",
    lastAssistantMessage: request.lastAssistantMessage ?? null,
    identityName: request.identityName ?? null,
    sessionId: request.sessionId ?? null,
    tumCourses: request.tumCourses ?? null,
  };

  let calendar: WeeklyCalendar | null = null;
  let currentPhase: AgentPhase = "onboarding";
  let userProfile: UserProfile | null = request.userProfile ?? null;
  let courseAnalysis: CourseAnalysis[] | null = request.courseAnalysis ?? null;
  let lastMessage: string | null = null;

  return runWithStreamContext(onEvent, async () => {
    const stream = compiledGraph.streamEvents(initialState, { version: "v2" });

    for await (const event of stream) {
      if (event.event === "on_chain_start" && NODE_THINKING[event.name]) {
        emitThinking(NODE_THINKING[event.name]);
      }

      if (event.event === "on_chain_end" && event.data?.output) {
        const output = event.data.output as Partial<AgentState>;
        if (output.calendar) {
          calendar = output.calendar;
          onEvent({ type: "calendar", payload: output.calendar });
        }
        if (output.currentPhase) currentPhase = output.currentPhase;
        if (output.userProfile) userProfile = output.userProfile;
        if (output.courseAnalysis) courseAnalysis = output.courseAnalysis;
        if (output.messages?.length) {
          const last = output.messages[output.messages.length - 1];
          if (last?.role === "assistant") lastMessage = last.content;
        }
      }
    }

    return { calendar, currentPhase, userProfile, courseAnalysis, lastMessage };
  });
}
