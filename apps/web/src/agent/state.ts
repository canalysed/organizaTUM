import { Annotation } from "@langchain/langgraph";
import type {
  AgentPhase,
  UserProfile,
  UserNote,
  CourseAnalysis,
  WeeklyCalendar,
  RefinementRequest,
  ChatMessage,
  Course,
} from "@organizaTUM/shared";

export type RefinementMode = "propose" | "apply" | "rejected";

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
  refinementMode: Annotation<RefinementMode>({
    reducer: (_existing, incoming) => incoming,
    default: () => "propose" as RefinementMode,
  }),
  lastAssistantMessage: Annotation<string | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
  userNotes: Annotation<UserNote[]>({
    reducer: (_existing, incoming) => incoming,
    default: () => [],
  }),
  identityName: Annotation<string | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
  sessionId: Annotation<string | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
  tumCourses: Annotation<Course[] | null>({
    reducer: (_existing, incoming) => incoming,
    default: () => null,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
