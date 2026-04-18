import { Annotation } from "@langchain/langgraph";
import type {
  AgentPhase,
  UserProfile,
  CourseAnalysis,
  WeeklyCalendar,
  RefinementRequest,
  ChatMessage,
} from "@organizaTUM/shared";

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<ChatMessage[]>({
    reducer: (existing, incoming) => existing.concat(incoming),
    default: () => [],
  }),
  currentPhase: Annotation<AgentPhase>({
    reducer: (_existing, incoming) => incoming,
    default: () => "onboarding" as AgentPhase,
  }),
  userProfile: Annotation<UserProfile | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
  courseAnalysis: Annotation<CourseAnalysis[] | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
  calendar: Annotation<WeeklyCalendar | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
  refinementRequest: Annotation<RefinementRequest | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
